import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchClinics } from '../store/slices/clinicSlice';
import { fetchSpecialties } from '../store/slices/specialtySlice';
import { fetchDoctors } from '../store/slices/doctorSlice';
import { logoutUser } from '../store/slices/authSlice';
import apiClient from '../utils/apiClient';
import NewDoctorModal from '../components/admin/NewDoctorModal';

const navItems = [
    { to: '/admin/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { to: '/admin/clinics', label: 'Clinics', icon: 'medical_services' },
    { to: '/admin/specialties', label: 'Specialties', icon: 'label' },
];

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const bookingStatusMap = {
    S1: 'text-blue-700 bg-blue-100',
    S2: 'text-red-700 bg-red-100',
    S3: 'text-emerald-700 bg-emerald-100',
    S4: 'text-amber-700 bg-amber-100',
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
    const { user } = useSelector((state) => state.auth);
    const { clinics, loading: clinicsLoading } = useSelector((state) => state.clinic);
    const { specialties, loading: specialtiesLoading } = useSelector((state) => state.specialty);
    const { doctors, loading: doctorsLoading } = useSelector((state) => state.doctor);

    const [users, setUsers] = useState([]);
    const [usersLoading, setUsersLoading] = useState(false);
    const [usersError, setUsersError] = useState('');
    const [search, setSearch] = useState('');
    const [bookingState, setBookingState] = useState({ loading: false, total: null, recent: [] });
    const [isNewDoctorOpen, setIsNewDoctorOpen] = useState(false);
    const [doctorNotice, setDoctorNotice] = useState('');

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
        if (doctors.length === 0) dispatch(fetchDoctors());
    }, [dispatch, clinics.length, specialties.length, doctors.length]);

    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    useEffect(() => {
        const loadBookings = async () => {
            setBookingState((prev) => ({ ...prev, loading: true }));
            try {
                const response = await apiClient.get('/admin/bookings');
                const payload = response.data?.data ?? response.data;
                const rows = Array.isArray(payload) ? payload : Array.isArray(payload?.items) ? payload.items : [];
                const total = Array.isArray(payload) ? payload.length : payload?.total ?? rows.length;
                setBookingState({ loading: false, total, recent: rows.slice(0, 3) });
            } catch {
                setBookingState({ loading: false, total: null, recent: [] });
            }
        };
        loadBookings();
    }, []);

    useEffect(() => {
        if (!doctorNotice) return undefined;
        const timer = setTimeout(() => setDoctorNotice(''), 4000);
        return () => clearTimeout(timer);
    }, [doctorNotice]);

    const handleDoctorCreated = useCallback((doctor) => {
        const doctorName = doctor?.name ? `"${doctor.name}"` : 'account';
        setDoctorNotice(`Doctor ${doctorName} created successfully.`);
        dispatch(fetchDoctors());
        loadUsers();
    }, [dispatch, loadUsers]);

    const clinicNames = useMemo(() => Object.fromEntries(clinics.map((c) => [String(c.id), c.name])), [clinics]);
    const specialtyNames = useMemo(() => Object.fromEntries(specialties.map((s) => [String(s.id), s.name])), [specialties]);
    const rows = useMemo(() => doctors.map((doctor) => {
        const doctorInfor = doctor.doctor_infor || doctor.doctorInfor;
        const relations = doctor.doctor_clinic_specialties || doctor.doctorClinicSpecialties || [];
        const rel = relations[0];
        const clinicId = rel?.clinicId ?? rel?.clinic_id;
        const specialtyId = rel?.specialtyId ?? rel?.specialty_id;
        return {
            id: doctor.id,
            name: doctor.name || 'Unknown',
            email: doctor.email || 'No email',
            clinic: rel?.clinic?.name || clinicNames[String(clinicId)] || doctorInfor?.nameClinic || doctorInfor?.name_clinic || 'Not assigned',
            specialty: rel?.specialty?.name || specialtyNames[String(specialtyId)] || 'General',
            status: doctorInfor ? 'Active' : 'Pending',
        };
    }), [doctors, clinicNames, specialtyNames]);

    const filteredRows = useMemo(() => {
        const key = search.trim().toLowerCase();
        if (!key) return rows;
        return rows.filter((item) => `${item.name} ${item.email} ${item.clinic} ${item.specialty}`.toLowerCase().includes(key));
    }, [rows, search]);

    const totalUsers = users.length;
    const totalAdmins = users.filter((item) => item.roleId === 'R1').length;
    const totalPatients = users.filter((item) => item.roleId === 'R3').length;
    const totalDoctors = users.filter((item) => item.roleId === 'R2').length || rows.length;
    const revenue = bookingState.total === null ? '-' : `GBP ${(bookingState.total * 35).toLocaleString('en-GB')}`;
    const chartValues = [0.45, 0.63, 0.53, 0.84, 0.49, 0.71, 0.4].map((ratio) => Math.round(Math.max(totalDoctors * 8, 20) * ratio));
    const chartMax = Math.max(...chartValues, 1);

    return (
        <div className="min-h-screen bg-background-light text-slate-900 font-display">
            <header className="sticky top-0 z-40 border-b border-slate-200 bg-white px-4 py-3 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="size-8 rounded-lg bg-primary/10 grid place-items-center"><span className="material-symbols-outlined text-primary">health_and_safety</span></div>
                        <p className="text-lg font-bold tracking-tight">HealthSync</p>
                        <label className="hidden md:block ml-4">
                            <div className="flex h-10 w-80 items-center rounded-lg bg-slate-100 text-slate-600">
                                <span className="material-symbols-outlined pl-3 text-base">search</span>
                                <input className="h-full w-full bg-transparent px-2 text-sm outline-none" placeholder="Search doctors, clinics, specialties..." value={search} onChange={(event) => setSearch(event.target.value)} />
                            </div>
                        </label>
                    </div>
                    <div className="hidden sm:flex items-center gap-3">
                        <span className="text-sm font-bold">{user?.name || 'System Admin'}</span>
                        <button type="button" onClick={() => dispatch(logoutUser())} className="rounded-lg bg-red-100 px-3 py-2 text-xs font-bold text-red-700">Sign Out</button>
                    </div>
                </div>
            </header>

            <div className="flex min-h-[calc(100vh-65px)]">
                <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white p-3 lg:block">
                    {navItems.map((item) => (
                        <NavLink key={item.to} to={item.to} className={({ isActive }) => `mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${isActive ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                            <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                            {item.label}
                        </NavLink>
                    ))}
                </aside>

                <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                    <div className="mx-auto max-w-7xl space-y-7">
                        {usersError && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{usersError}</div>}
                        {doctorNotice && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{doctorNotice}</div>}

                        <section className="flex flex-wrap items-end justify-between gap-3">
                            <div><h1 className="text-3xl font-black tracking-tight">Dashboard Overview</h1><p className="text-sm text-slate-500">Healthcare system metrics and performance summary.</p></div>
                            <div className="flex gap-2">
                                <button type="button" className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700">Export Data</button>
                                <button type="button" onClick={() => setIsNewDoctorOpen(true)} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white">New Doctor</button>
                            </div>
                        </section>

                        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                            <StatCard title="Total Users" icon="groups" value={usersLoading ? '-' : totalUsers} note={`Admins: ${totalAdmins} | Doctors: ${totalDoctors} | Patients: ${totalPatients}`} />
                            <StatCard title="Total Bookings" icon="calendar_month" value={bookingState.loading ? '-' : bookingState.total ?? '-'} note="Live when /api/admin/bookings exists." iconClass="bg-amber-100 text-amber-700" />
                            <StatCard title="Active Clinics" icon="location_on" value={clinicsLoading ? '-' : clinics.length} note="Registered locations in system." iconClass="bg-emerald-100 text-emerald-700" />
                            <StatCard title="Total Revenue" icon="payments" value={revenue} note="Estimated by booking volume." />
                        </section>

                        <section className="space-y-3">
                            <h2 className="text-2xl font-black tracking-tight">User Management - Doctors</h2>
                            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                                <table className="w-full min-w-[700px] text-left">
                                    <thead className="border-b border-slate-200 bg-slate-50"><tr><th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">Doctor</th><th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">Specialty</th><th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">Clinic</th><th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">Status</th></tr></thead>
                                    <tbody className="divide-y divide-slate-200">
                                        {doctorsLoading ? <tr><td colSpan={4} className="px-6 py-8 text-sm text-slate-500">Loading doctors...</td></tr> : filteredRows.slice(0, 6).map((doctor) => (
                                            <tr key={doctor.id} className="hover:bg-slate-50">
                                                <td className="px-6 py-4"><p className="text-sm font-bold">{doctor.name}</p><p className="text-xs text-slate-500">{doctor.email}</p></td>
                                                <td className="px-6 py-4"><span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-700">{doctor.specialty}</span></td>
                                                <td className="px-6 py-4 text-sm text-slate-600">{doctor.clinic}</td>
                                                <td className="px-6 py-4 text-xs font-bold text-emerald-600">{doctor.status}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                            <div className="xl:col-span-2 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                                <h2 className="text-xl font-black">Booking Management</h2>
                                <div className="mt-4 space-y-3">
                                    {bookingState.loading ? <p className="text-sm text-slate-500">Loading bookings...</p> : bookingState.recent.length === 0 ? <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">No booking feed yet. Add GET /api/admin/bookings to show records here.</p> : bookingState.recent.map((item) => {
                                        const status = item.statusId || item.status || 'S1';
                                        const cls = bookingStatusMap[status] || 'text-slate-700 bg-slate-100';
                                        return (
                                            <div key={item.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                                                <div><p className="text-sm font-bold">Patient #{item.patientId || '--'}</p><p className="text-xs text-slate-500">Doctor #{item.doctorId || '--'} | {item.date || '--'} | {item.timeType || '--'}</p></div>
                                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${cls}`}>{status}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h2 className="text-xl font-black">Master Data</h2>
                                <Link to="/admin/clinics" className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-primary/40"><p className="text-sm font-bold">Clinics</p><p className="text-xs text-slate-500">{clinicsLoading ? '-' : clinics.length} active locations</p></Link>
                                <Link to="/admin/specialties" className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-primary/40"><p className="text-sm font-bold">Specialties</p><p className="text-xs text-slate-500">{specialtiesLoading ? '-' : specialties.length} registered fields</p></Link>
                            </div>
                        </section>

                        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                            <h2 className="text-xl font-black">Consultation Revenue</h2>
                            <div className="mt-4 h-56">
                                <div className="flex h-full items-end gap-3">
                                    {chartValues.map((value, index) => (
                                        <div key={days[index]} className="flex flex-1 flex-col justify-end">
                                            <div className={`${index === 3 ? 'bg-primary' : 'bg-primary/35'} rounded-t-lg`} style={{ height: `${Math.max((value / chartMax) * 100, 12)}%` }}></div>
                                            <p className="mt-2 text-center text-xs font-bold text-slate-400">{days[index]}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>
                    </div>
                </main>
            </div>
            <NewDoctorModal
                isOpen={isNewDoctorOpen}
                onClose={() => setIsNewDoctorOpen(false)}
                clinics={clinics}
                specialties={specialties}
                onCreated={handleDoctorCreated}
            />
        </div>
    );
};

export default AdminDashboard;
