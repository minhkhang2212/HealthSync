import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchClinics } from '../store/slices/clinicSlice';
import { fetchSpecialties } from '../store/slices/specialtySlice';
import { fetchDoctors } from '../store/slices/doctorSlice';
import apiClient from '../utils/apiClient';
import { readAllcodeCache, writeAllcodeCache } from '../utils/allcodeCache';
import { DEFAULT_TIME_LABELS } from '../utils/timeSlots';
import NewDoctorModal from '../components/admin/NewDoctorModal';
import AdminShell from '../components/layout/AdminShell';
import {
    DEFAULT_ADMIN_BOOKING_STATUS_LABELS,
    buildAdminBookingRows,
    buildDoctorAdminRows,
    sortByNewestCreated,
} from '../utils/adminManagement';

const DOCTOR_PREVIEW_LIMIT = 4;
const BOOKING_PREVIEW_LIMIT = 3;
const MONTHLY_REVENUE_CHART_LIMIT = 6;
const REVENUE_CHART_SKELETON_HEIGHTS = ['34%', '52%', '46%', '68%', '58%', '74%'];

const getBookingDateParts = (date) => {
    const parsed = new Date(`${date}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return { month: '---', day: '--' };

    return {
        month: parsed.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase(),
        day: parsed.toLocaleDateString('en-GB', { day: '2-digit' }),
    };
};

const formatMinorCurrency = (amount, currency = 'gbp') => {
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount)) return '-';

    const currencyCode = String(currency || 'gbp').toUpperCase();
    const majorAmount = numericAmount / 100;

    return `${currencyCode} ${majorAmount.toLocaleString('en-GB', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
};

const formatRevenueMonthShortLabel = (month) => {
    const parsed = new Date(`${month}-01T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return month;

    return parsed.toLocaleDateString('en-GB', { month: 'short' });
};

const parseRevenueMonth = (month) => {
    const matched = /^(\d{4})-(\d{2})$/.exec(String(month || ''));
    if (!matched) return null;

    const year = Number.parseInt(matched[1], 10);
    const monthIndex = Number.parseInt(matched[2], 10) - 1;
    if (!Number.isInteger(year) || !Number.isInteger(monthIndex) || monthIndex < 0 || monthIndex > 11) {
        return null;
    }

    return new Date(year, monthIndex, 1);
};

const formatRevenueMonthKey = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
};

const formatRevenueMonthLongLabel = (date) =>
    date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

const buildRevenueTrendWindow = (items, currentMonth, currency, limit = MONTHLY_REVENUE_CHART_LIMIT) => {
    const anchorDate = parseRevenueMonth(currentMonth) || parseRevenueMonth(items[0]?.month);
    if (!anchorDate) return [];

    const itemMap = new Map(items.map((item) => [item.month, item]));
    const resolvedCurrency = currency || 'gbp';
    const window = [];

    for (let offset = limit - 1; offset >= 0; offset -= 1) {
        const monthDate = new Date(anchorDate.getFullYear(), anchorDate.getMonth() - offset, 1);
        const monthKey = formatRevenueMonthKey(monthDate);
        const existingItem = itemMap.get(monthKey);

        window.push(existingItem || {
            month: monthKey,
            label: formatRevenueMonthLongLabel(monthDate),
            recognizedRevenueAmount: 0,
            recognizedRevenueCurrency: resolvedCurrency,
            paidBookingsCount: 0,
        });
    }

    return window;
};

const getRevenueBarHeight = (amount, maxAmount) => {
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) return '0%';

    const safeMaxAmount = Math.max(Number(maxAmount) || 0, 1);
    return `${Math.max((numericAmount / safeMaxAmount) * 100, 12)}%`;
};

const StatCard = ({ title, icon, value, note, iconClass = 'bg-primary/10 text-primary' }) => (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{title}</p>
            <span className={`rounded-lg p-2 ${iconClass}`}>
                <span className="material-symbols-outlined text-[18px]">{icon}</span>
            </span>
        </div>
        <p className="mt-3 text-4xl font-black">{value}</p>
        <p className="mt-2 text-xs text-slate-500">{note}</p>
    </div>
);

const AdminDashboard = () => {
    const dispatch = useDispatch();
    const { clinics, loading: clinicsLoading } = useSelector((state) => state.clinic);
    const { specialties, loading: specialtiesLoading } = useSelector((state) => state.specialty);
    const { doctors, loading: doctorsLoading } = useSelector((state) => state.doctor);

    const [users, setUsers] = useState([]);
    const [usersLoading, setUsersLoading] = useState(false);
    const [usersError, setUsersError] = useState('');
    const [bookingState, setBookingState] = useState({
        loading: false,
        total: null,
        items: [],
        recognizedRevenueAmount: null,
        recognizedRevenueCurrency: 'gbp',
    });
    const [activeRevenueTooltipMonth, setActiveRevenueTooltipMonth] = useState('');
    const [revenueTrendState, setRevenueTrendState] = useState({
        loading: true,
        error: '',
        items: [],
        currentMonth: '',
        currency: 'gbp',
    });
    const [isNewDoctorOpen, setIsNewDoctorOpen] = useState(false);
    const [isEditDoctorOpen, setIsEditDoctorOpen] = useState(false);
    const [selectedDoctor, setSelectedDoctor] = useState(null);
    const [doctorActionId, setDoctorActionId] = useState(null);
    const [doctorNotice, setDoctorNotice] = useState('');
    const [statusLabels, setStatusLabels] = useState(DEFAULT_ADMIN_BOOKING_STATUS_LABELS);
    const [timeLabels, setTimeLabels] = useState(DEFAULT_TIME_LABELS);

    const loadUsers = useCallback(async () => {
        setUsersLoading(true);
        setUsersError('');
        try {
            const response = await apiClient.get('/admin/users');
            const payload = response.data?.data ?? response.data;
            setUsers(Array.isArray(payload) ? payload : []);
        } catch (error) {
            setUsersError(error.response?.data?.message || 'Failed to fetch users.');
        } finally {
            setUsersLoading(false);
        }
    }, []);

    useEffect(() => {
        if (clinics.length === 0) dispatch(fetchClinics());
        if (specialties.length === 0) dispatch(fetchSpecialties());
        if (!doctorsLoading && doctors.length === 0) {
            dispatch(fetchDoctors({ admin: true }));
        }
    }, [dispatch, clinics.length, specialties.length, doctorsLoading, doctors.length]);

    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    useEffect(() => {
        const loadBookings = async () => {
            setBookingState((prev) => ({ ...prev, loading: true }));
            try {
                const response = await apiClient.get('/admin/bookings');
                const payload = response.data?.data ?? response.data;
                const items = Array.isArray(payload) ? payload : Array.isArray(payload?.items) ? payload.items : [];
                const total = Array.isArray(payload) ? payload.length : payload?.total ?? items.length;
                const recognizedRevenueAmount = Array.isArray(payload) ? null : payload?.recognizedRevenueAmount ?? null;
                const recognizedRevenueCurrency = Array.isArray(payload) ? 'gbp' : payload?.recognizedRevenueCurrency ?? 'gbp';

                setBookingState({
                    loading: false,
                    total,
                    items,
                    recognizedRevenueAmount,
                    recognizedRevenueCurrency,
                });
            } catch {
                setBookingState({
                    loading: false,
                    total: null,
                    items: [],
                    recognizedRevenueAmount: null,
                    recognizedRevenueCurrency: 'gbp',
                });
            }
        };

        loadBookings();
    }, []);

    useEffect(() => {
        let isMounted = true;

        const loadRevenueTrend = async () => {
            setRevenueTrendState((prev) => ({
                ...prev,
                loading: true,
                error: '',
            }));

            try {
                const response = await apiClient.get('/admin/revenue/monthly');
                const payload = response.data?.data ?? response.data;
                if (!isMounted) return;

                setRevenueTrendState({
                    loading: false,
                    error: '',
                    items: Array.isArray(payload?.items) ? payload.items : [],
                    currentMonth: payload?.currentMonth || '',
                    currency: payload?.recognizedRevenueCurrency || 'gbp',
                });
            } catch (error) {
                if (!isMounted) return;

                setRevenueTrendState({
                    loading: false,
                    error: error.response?.data?.message || 'Revenue trend unavailable right now.',
                    items: [],
                    currentMonth: '',
                    currency: 'gbp',
                });
            }
        };

        loadRevenueTrend();

        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        const loadCodeLabels = async () => {
            try {
                const cachedStatus = readAllcodeCache('STATUS');
                const cachedTime = readAllcodeCache('TIME');

                const [statusRes, timeRes] = await Promise.all([
                    cachedStatus
                        ? Promise.resolve({ data: cachedStatus })
                        : apiClient.get('/allcodes', { params: { type: 'STATUS' } }),
                    cachedTime
                        ? Promise.resolve({ data: cachedTime })
                        : apiClient.get('/allcodes', { params: { type: 'TIME' } }),
                ]);

                if (!cachedStatus && Array.isArray(statusRes.data)) {
                    writeAllcodeCache('STATUS', statusRes.data);
                }
                if (!cachedTime && Array.isArray(timeRes.data)) {
                    writeAllcodeCache('TIME', timeRes.data);
                }

                const nextStatus = { ...DEFAULT_ADMIN_BOOKING_STATUS_LABELS };
                const nextTime = { ...DEFAULT_TIME_LABELS };

                for (const item of statusRes.data || []) {
                    if (item?.key) nextStatus[item.key] = item.valueEn || item.key;
                }
                for (const item of timeRes.data || []) {
                    if (item?.key) nextTime[item.key] = item.valueEn || item.key;
                }

                setStatusLabels(nextStatus);
                setTimeLabels(nextTime);
            } catch {
                setStatusLabels(DEFAULT_ADMIN_BOOKING_STATUS_LABELS);
                setTimeLabels(DEFAULT_TIME_LABELS);
            }
        };

        loadCodeLabels();
    }, []);

    useEffect(() => {
        if (!doctorNotice) return undefined;
        const timer = setTimeout(() => setDoctorNotice(''), 4000);
        return () => clearTimeout(timer);
    }, [doctorNotice]);

    const handleDoctorCreated = useCallback((doctor) => {
        const doctorName = doctor?.name ? `"${doctor.name}"` : 'account';
        setDoctorNotice(`Doctor ${doctorName} created successfully.`);
        dispatch(fetchDoctors({ admin: true }));
        loadUsers();
    }, [dispatch, loadUsers]);

    const handleDoctorUpdated = useCallback((doctor) => {
        const doctorName = doctor?.name ? `"${doctor.name}"` : 'profile';
        setDoctorNotice(`Doctor ${doctorName} updated successfully.`);
        dispatch(fetchDoctors({ admin: true }));
    }, [dispatch]);

    const handleOpenEditDoctor = useCallback((doctor) => {
        setSelectedDoctor(doctor);
        setIsEditDoctorOpen(true);
    }, []);

    const handleToggleDoctorActive = useCallback(async (doctor) => {
        const nextValue = !doctor.isActive;
        if (!nextValue && !window.confirm(`Set doctor "${doctor.name}" as inactive? This doctor will be hidden from Patient Dashboard.`)) {
            return;
        }

        setDoctorActionId(doctor.id);
        try {
            await apiClient.patch(`/admin/doctors/${doctor.id}`, { isActive: nextValue });
            setDoctorNotice(`Doctor "${doctor.name}" is now ${nextValue ? 'active' : 'inactive'}.`);
            dispatch(fetchDoctors({ admin: true }));
        } catch (toggleError) {
            setUsersError(toggleError.response?.data?.message || 'Failed to update doctor status.');
        } finally {
            setDoctorActionId(null);
        }
    }, [dispatch]);

    const clinicNames = useMemo(
        () => Object.fromEntries(clinics.map((clinic) => [String(clinic.id), clinic.name])),
        [clinics]
    );
    const specialtyNames = useMemo(
        () => Object.fromEntries(specialties.map((specialty) => [String(specialty.id), specialty.name])),
        [specialties]
    );

    const doctorRows = useMemo(
        () => buildDoctorAdminRows(doctors, clinicNames, specialtyNames),
        [doctors, clinicNames, specialtyNames]
    );
    const doctorRowsByNewest = useMemo(() => sortByNewestCreated(doctorRows), [doctorRows]);
    const previewDoctors = useMemo(
        () => doctorRowsByNewest.slice(0, DOCTOR_PREVIEW_LIMIT),
        [doctorRowsByNewest]
    );

    const doctorSpecialtyById = useMemo(() => {
        const map = {};
        for (const doctorRow of doctorRows) {
            map[String(doctorRow.id)] = doctorRow.specialty;
        }
        return map;
    }, [doctorRows]);

    const bookingRows = useMemo(
        () => buildAdminBookingRows(bookingState.items, {
            doctorSpecialtyById,
            statusLabels,
            timeLabels,
        }),
        [bookingState.items, doctorSpecialtyById, statusLabels, timeLabels]
    );
    const bookingRowsByNewest = useMemo(() => sortByNewestCreated(bookingRows), [bookingRows]);
    const previewBookings = useMemo(
        () => bookingRowsByNewest.slice(0, BOOKING_PREVIEW_LIMIT),
        [bookingRowsByNewest]
    );

    const totalUsers = users.length;
    const totalAdmins = users.filter((item) => item.roleId === 'R1').length;
    const totalPatients = users.filter((item) => item.roleId === 'R3').length;
    const totalDoctors = users.filter((item) => item.roleId === 'R2').length || doctorRows.length;
    const revenue = bookingState.recognizedRevenueAmount === null
        ? '-'
        : formatMinorCurrency(bookingState.recognizedRevenueAmount, bookingState.recognizedRevenueCurrency);
    const revenueTrendItems = useMemo(
        () => buildRevenueTrendWindow(
            revenueTrendState.items,
            revenueTrendState.currentMonth,
            revenueTrendState.currency,
            MONTHLY_REVENUE_CHART_LIMIT
        ),
        [revenueTrendState.items, revenueTrendState.currentMonth, revenueTrendState.currency]
    );
    const revenueTrendMax = useMemo(
        () => Math.max(...revenueTrendItems.map((item) => Number(item.recognizedRevenueAmount) || 0), 1),
        [revenueTrendItems]
    );

    return (
        <AdminShell>
            {usersError && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{usersError}</div>}
            {doctorNotice && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{doctorNotice}</div>}

            <section className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-3xl font-black tracking-tight">Dashboard Overview</h1>
                    <p className="text-sm text-slate-500">Healthcare system metrics and performance summary.</p>
                </div>
                <div className="flex gap-2">
                    <Link to="/admin/revenue" className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700">
                        Export Data
                    </Link>
                    <button
                        type="button"
                        onClick={() => setIsNewDoctorOpen(true)}
                        className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white"
                    >
                        New Doctor
                    </button>
                </div>
            </section>

            <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <StatCard title="Total Users" icon="groups" value={usersLoading ? '-' : totalUsers} note={`Admins: ${totalAdmins} | Doctors: ${totalDoctors} | Patients: ${totalPatients}`} />
                <StatCard title="Total Bookings" icon="calendar_month" value={bookingState.loading ? '-' : bookingState.total ?? '-'} note="Live data from recent booking activity." iconClass="bg-amber-100 text-amber-700" />
                <StatCard title="Active Clinics" icon="location_on" value={clinicsLoading ? '-' : clinics.length} note="Registered locations in system." iconClass="bg-emerald-100 text-emerald-700" />
                <StatCard title="Total Revenue" icon="payments" value={revenue} note="Current month. Use Export Data to review previous months and download PDF reports." />
            </section>

            <section className="space-y-3">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <h2 className="text-2xl font-black tracking-tight">User Management - Doctors</h2>
                        <p className="mt-1 text-sm text-slate-500">Showing the latest 4 doctors added to the system.</p>
                    </div>
                    <Link to="/admin/doctors" className="text-sm font-black text-primary hover:text-blue-700">
                        View Full Doctors
                    </Link>
                </div>
                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                    <table className="w-full min-w-[700px] text-left" data-testid="dashboard-doctors-preview-table">
                        <thead className="border-b border-slate-200 bg-slate-50">
                            <tr>
                                <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">Doctor</th>
                                <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">Specialty</th>
                                <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">Clinic</th>
                                <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">Status</th>
                                <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {doctorsLoading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-sm text-slate-500">Loading doctors...</td>
                                </tr>
                            ) : previewDoctors.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-sm text-slate-500">No doctors yet.</td>
                                </tr>
                            ) : previewDoctors.map((doctor) => (
                                <tr key={doctor.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4">
                                        <p className="text-sm font-bold">{doctor.name}</p>
                                        <p className="text-xs text-slate-500">{doctor.email}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-700">{doctor.specialty}</span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600">{doctor.clinic}</td>
                                    <td className="px-6 py-4">
                                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${doctor.statusClass}`}>{doctor.statusText}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                type="button"
                                                onClick={() => handleOpenEditDoctor(doctor.raw)}
                                                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:border-primary hover:text-primary"
                                            >
                                                Edit Profile
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleToggleDoctorActive(doctor.raw)}
                                                disabled={doctorActionId === doctor.id}
                                                className={`rounded-lg px-3 py-1.5 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-60 ${doctor.isActive ? 'bg-rose-100 text-rose-700 hover:bg-rose-200' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}
                                            >
                                                {doctorActionId === doctor.id ? 'Saving...' : doctor.isActive ? 'Set Inactive' : 'Activate'}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                <div className="xl:col-span-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap items-end justify-between gap-3">
                        <div>
                            <h2 className="text-lg font-black">Booking Management</h2>
                            <p className="mt-1 text-sm text-slate-500">Showing the latest 3 bookings created in the system.</p>
                        </div>
                        <Link to="/admin/bookings" className="text-sm font-black text-primary hover:text-blue-700">
                            View Full Bookings
                        </Link>
                    </div>
                    <div className="mt-3 space-y-2.5" data-testid="dashboard-bookings-preview-list">
                        {bookingState.loading ? (
                            <p className="text-sm text-slate-500">Loading bookings...</p>
                        ) : previewBookings.length === 0 ? (
                            <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">No bookings have been created yet.</p>
                        ) : previewBookings.map((item) => {
                            const dateParts = getBookingDateParts(item.appointmentDate);

                            return (
                                <div key={item.id} data-testid={`dashboard-booking-${item.id}`} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2.5 sm:px-3">
                                    <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-lg ${item.statusDateClass}`}>
                                        <div className="text-center leading-none">
                                            <p className="text-[9px] font-black tracking-wide">{dateParts.month}</p>
                                            <p className="mt-0.5 text-[20px] font-black">{Number.parseInt(dateParts.day, 10) || dateParts.day}</p>
                                        </div>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-black sm:text-base">Patient: {item.patientName}</p>
                                        <p className="mt-0.5 truncate text-xs text-slate-500 sm:text-sm">{item.doctorName} • {item.specialtyName}</p>
                                        <p className="mt-1 truncate text-[11px] font-semibold text-slate-400">Created {item.createdDateLabel}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${item.statusChipClass}`}>
                                            {String(item.statusLabel).toUpperCase()}
                                        </span>
                                        <p className="mt-1 text-[11px] font-bold text-slate-400">{item.timeLabel}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="space-y-3">
                    <h2 className="text-xl font-black">Master Data</h2>
                    <Link to="/admin/clinics" className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-primary/40">
                        <p className="text-sm font-bold">Clinics</p>
                        <p className="text-xs text-slate-500">{clinicsLoading ? '-' : clinics.length} active locations</p>
                    </Link>
                    <Link to="/admin/specialties" className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-primary/40">
                        <p className="text-sm font-bold">Specialties</p>
                        <p className="text-xs text-slate-500">{specialtiesLoading ? '-' : specialties.length} registered fields</p>
                    </Link>
                </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-black">Consultation Revenue</h2>
                <p className="mt-1 text-sm text-slate-500">Last 6 months of recognized consultation revenue.</p>
                <div className="mt-4 h-56">
                    {revenueTrendState.loading ? (
                        <div
                            role="status"
                            aria-label="Loading revenue trend"
                            data-testid="consultation-revenue-loading"
                            className="flex h-full items-stretch gap-3 animate-pulse"
                        >
                            {REVENUE_CHART_SKELETON_HEIGHTS.map((height, index) => (
                                <div key={`skeleton-${index}`} className="flex h-full min-w-0 flex-1 flex-col justify-end">
                                    <div className="flex min-h-0 flex-1 items-end rounded-t-xl bg-slate-100 px-1 pb-0">
                                        <div className="w-full rounded-t-lg bg-slate-200" style={{ height }}></div>
                                    </div>
                                    <div className="mx-auto mt-3 h-3 w-8 rounded bg-slate-100"></div>
                                </div>
                            ))}
                        </div>
                    ) : revenueTrendState.error ? (
                        <div
                            data-testid="consultation-revenue-error"
                            className="flex h-full items-center justify-center rounded-xl border border-red-100 bg-red-50/70 px-4 text-center text-sm text-red-700"
                        >
                            {revenueTrendState.error}
                        </div>
                    ) : revenueTrendItems.length === 0 ? (
                        <div
                            data-testid="consultation-revenue-empty"
                            className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 text-center text-sm text-slate-500"
                        >
                            Revenue trend unavailable right now.
                        </div>
                    ) : (
                        <div data-testid="consultation-revenue-chart" className="flex h-full items-stretch gap-3">
                            {revenueTrendItems.map((item) => {
                                const amount = Number(item.recognizedRevenueAmount) || 0;
                                const isCurrentMonth = item.month === revenueTrendState.currentMonth;
                                const fullLabel = item.label || item.month;
                                const amountLabel = formatMinorCurrency(amount, item.recognizedRevenueCurrency || revenueTrendState.currency);
                                const shortLabel = formatRevenueMonthShortLabel(item.month);

                                return (
                                    <div
                                        key={item.month}
                                        role="img"
                                        title={`${fullLabel}: ${amountLabel}`}
                                        aria-label={`${fullLabel}: ${amountLabel}`}
                                        data-testid={`revenue-bar-${item.month}`}
                                        data-month={item.month}
                                        data-current-month={isCurrentMonth ? 'true' : 'false'}
                                        tabIndex={0}
                                        onMouseEnter={() => setActiveRevenueTooltipMonth(item.month)}
                                        onMouseLeave={() => setActiveRevenueTooltipMonth((current) => (current === item.month ? '' : current))}
                                        onFocus={() => setActiveRevenueTooltipMonth(item.month)}
                                        onBlur={() => setActiveRevenueTooltipMonth((current) => (current === item.month ? '' : current))}
                                        className="relative flex h-full min-w-0 flex-1 flex-col justify-end outline-none"
                                    >
                                        {activeRevenueTooltipMonth === item.month && (
                                            <div
                                                data-testid={`revenue-tooltip-${item.month}`}
                                                className="pointer-events-none absolute left-1/2 top-2 z-10 w-max max-w-[calc(100%-8px)] -translate-x-1/2 rounded-lg bg-slate-900 px-3 py-2 text-center text-xs text-white shadow-lg"
                                            >
                                                <p className="font-black">{fullLabel}</p>
                                                <p className="mt-0.5 font-semibold text-slate-200">{amountLabel}</p>
                                            </div>
                                        )}
                                        <div className="flex min-h-0 flex-1 items-end rounded-t-xl bg-slate-50/70 px-1 pb-0">
                                            <div
                                                data-testid={`revenue-bar-fill-${item.month}`}
                                                className={`w-full rounded-t-lg transition-[height,background-color] duration-300 ${isCurrentMonth ? 'bg-primary shadow-[0_10px_24px_rgba(37,99,235,0.28)]' : 'bg-primary/35'}`}
                                                style={{ height: getRevenueBarHeight(amount, revenueTrendMax) }}
                                            ></div>
                                        </div>
                                        <p className={`mt-2 text-center text-xs font-bold ${isCurrentMonth ? 'text-slate-700' : 'text-slate-400'}`}>
                                            {shortLabel}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </section>

            <NewDoctorModal
                isOpen={isNewDoctorOpen}
                onClose={() => setIsNewDoctorOpen(false)}
                clinics={clinics}
                specialties={specialties}
                onCreated={handleDoctorCreated}
            />
            <NewDoctorModal
                isOpen={isEditDoctorOpen}
                onClose={() => {
                    setIsEditDoctorOpen(false);
                    setSelectedDoctor(null);
                }}
                clinics={clinics}
                specialties={specialties}
                mode="edit"
                doctor={selectedDoctor}
                onUpdated={handleDoctorUpdated}
            />
        </AdminShell>
    );
};

export default AdminDashboard;
