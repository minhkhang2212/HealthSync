import React, { useEffect, useMemo, useState } from 'react';
import AdminShell from '../components/layout/AdminShell';
import apiClient from '../utils/apiClient';
import { readAllcodeCache, writeAllcodeCache } from '../utils/allcodeCache';
import {
    DEFAULT_ADMIN_BOOKING_STATUS_LABELS,
    buildAdminBookingRows,
    filterAdminBookingRows,
    sortByNewestCreated,
} from '../utils/adminManagement';
import { DEFAULT_TIME_LABELS } from '../utils/timeSlots';

const formatMinorCurrency = (amount, currency = 'gbp') => {
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount)) {
        return '-';
    }

    const currencyCode = String(currency || 'gbp').toUpperCase();
    const majorAmount = numericAmount / 100;

    return `${currencyCode} ${majorAmount.toLocaleString('en-GB', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
};

const formatPaymentStatusLabel = (value) => {
    if (!value) {
        return 'Payment status unavailable';
    }

    return String(value)
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (character) => character.toUpperCase());
};

const BookingManagement = () => {
    const [search, setSearch] = useState('');
    const [filters, setFilters] = useState({
        status: 'all',
        paymentMethod: 'all',
        doctorId: 'all',
        dateFrom: '',
        dateTo: '',
    });
    const [bookingState, setBookingState] = useState({
        loading: true,
        error: '',
        items: [],
        total: 0,
    });
    const [statusLabels, setStatusLabels] = useState(DEFAULT_ADMIN_BOOKING_STATUS_LABELS);
    const [timeLabels, setTimeLabels] = useState(DEFAULT_TIME_LABELS);

    useEffect(() => {
        let isMounted = true;

        const loadBookings = async () => {
            setBookingState((prev) => ({ ...prev, loading: true, error: '' }));

            try {
                const response = await apiClient.get('/admin/bookings');
                const payload = response.data?.data ?? response.data;
                const items = Array.isArray(payload) ? payload : Array.isArray(payload?.items) ? payload.items : [];
                const total = Array.isArray(payload) ? payload.length : payload?.total ?? items.length;

                if (!isMounted) {
                    return;
                }

                setBookingState({
                    loading: false,
                    error: '',
                    items,
                    total,
                });
            } catch (error) {
                if (!isMounted) {
                    return;
                }

                setBookingState({
                    loading: false,
                    error: error.response?.data?.message || 'Failed to fetch bookings.',
                    items: [],
                    total: 0,
                });
            }
        };

        loadBookings();

        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        let isMounted = true;

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

                if (!isMounted) {
                    return;
                }

                if (!cachedStatus && Array.isArray(statusRes.data)) {
                    writeAllcodeCache('STATUS', statusRes.data);
                }
                if (!cachedTime && Array.isArray(timeRes.data)) {
                    writeAllcodeCache('TIME', timeRes.data);
                }

                const nextStatus = { ...DEFAULT_ADMIN_BOOKING_STATUS_LABELS };
                const nextTime = { ...DEFAULT_TIME_LABELS };

                for (const item of statusRes.data || []) {
                    if (item?.key) {
                        nextStatus[item.key] = item.valueEn || item.key;
                    }
                }

                for (const item of timeRes.data || []) {
                    if (item?.key) {
                        nextTime[item.key] = item.valueEn || item.key;
                    }
                }

                setStatusLabels(nextStatus);
                setTimeLabels(nextTime);
            } catch {
                if (!isMounted) {
                    return;
                }

                setStatusLabels(DEFAULT_ADMIN_BOOKING_STATUS_LABELS);
                setTimeLabels(DEFAULT_TIME_LABELS);
            }
        };

        loadCodeLabels();

        return () => {
            isMounted = false;
        };
    }, []);

    const bookingRows = useMemo(
        () => sortByNewestCreated(buildAdminBookingRows(bookingState.items, { statusLabels, timeLabels })),
        [bookingState.items, statusLabels, timeLabels]
    );

    const filteredBookings = useMemo(
        () => filterAdminBookingRows(bookingRows, {
            search,
            status: filters.status,
            paymentMethod: filters.paymentMethod,
            doctorId: filters.doctorId,
            dateFrom: filters.dateFrom,
            dateTo: filters.dateTo,
        }),
        [bookingRows, search, filters]
    );

    const statusOptions = useMemo(() => {
        const seen = new Map();
        for (const item of bookingRows) {
            if (!seen.has(item.statusValue)) {
                seen.set(item.statusValue, item.statusLabel);
            }
        }
        return Array.from(seen, ([value, label]) => ({ value, label }));
    }, [bookingRows]);

    const paymentMethodOptions = useMemo(() => {
        const seen = new Map();
        for (const item of bookingRows) {
            if (item.paymentMethod && !seen.has(item.paymentMethod)) {
                seen.set(item.paymentMethod, item.paymentMethodLabel);
            }
        }
        return Array.from(seen, ([value, label]) => ({ value, label }));
    }, [bookingRows]);

    const doctorOptions = useMemo(() => {
        const seen = new Map();
        for (const item of bookingRows) {
            if (item.doctorId && !seen.has(item.doctorId)) {
                seen.set(item.doctorId, item.doctorName);
            }
        }
        return Array.from(seen, ([value, label]) => ({ value, label }))
            .sort((left, right) => left.label.localeCompare(right.label));
    }, [bookingRows]);

    const showingText = filteredBookings.length === bookingRows.length
        ? `Showing all ${bookingRows.length} bookings.`
        : `Showing ${filteredBookings.length} of ${bookingRows.length} bookings.`;

    return (
        <AdminShell>
            {bookingState.error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {bookingState.error}
                </div>
            )}

            <section className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-3xl font-black tracking-tight">Bookings</h1>
                    <p className="mt-1 text-sm text-slate-500">Full appointment list with client-side search, filters, and newest-first sorting.</p>
                </div>
                <div className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600">
                    Total in feed: {bookingState.loading ? '-' : bookingState.total}
                </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-7">
                    <label className="space-y-2 text-sm font-semibold text-slate-700 md:col-span-2">
                        <span>Search</span>
                        <div className="flex h-11 items-center rounded-lg border border-slate-300 bg-white text-slate-500 focus-within:border-primary">
                            <span className="material-symbols-outlined pl-3 text-[20px]">search</span>
                            <input
                                type="search"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Search patient, doctor, contact email, booking id..."
                                className="h-full w-full bg-transparent px-2 pr-3 text-sm font-medium text-slate-700 outline-none placeholder:text-slate-400"
                            />
                        </div>
                    </label>

                    <label className="space-y-2 text-sm font-semibold text-slate-700">
                        <span>Status</span>
                        <select
                            value={filters.status}
                            onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-primary"
                        >
                            <option value="all">All statuses</option>
                            {statusOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="space-y-2 text-sm font-semibold text-slate-700">
                        <span>Payment Method</span>
                        <select
                            value={filters.paymentMethod}
                            onChange={(event) => setFilters((prev) => ({ ...prev, paymentMethod: event.target.value }))}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-primary"
                        >
                            <option value="all">All payment methods</option>
                            {paymentMethodOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="space-y-2 text-sm font-semibold text-slate-700">
                        <span>Doctor</span>
                        <select
                            value={filters.doctorId}
                            onChange={(event) => setFilters((prev) => ({ ...prev, doctorId: event.target.value }))}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-primary"
                        >
                            <option value="all">All doctors</option>
                            {doctorOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="space-y-2 text-sm font-semibold text-slate-700">
                        <span>Date From</span>
                        <input
                            type="date"
                            value={filters.dateFrom}
                            onChange={(event) => setFilters((prev) => ({ ...prev, dateFrom: event.target.value }))}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-primary"
                        />
                    </label>

                    <label className="space-y-2 text-sm font-semibold text-slate-700">
                        <span>Date To</span>
                        <input
                            type="date"
                            value={filters.dateTo}
                            onChange={(event) => setFilters((prev) => ({ ...prev, dateTo: event.target.value }))}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-primary"
                        />
                    </label>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-100 pt-3 text-sm">
                    <span className="font-semibold text-slate-700">{showingText}</span>
                    <span className="text-slate-500">Search covers patient, doctor, contact email, booking ID, and booking detail text.</span>
                </div>
            </section>

            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[1100px] text-left" data-testid="booking-management-table">
                        <thead className="border-b border-slate-200 bg-slate-50">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Booking</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Patient</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Doctor</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Appointment</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Created</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Payment</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {bookingState.loading && bookingRows.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-500">
                                        Loading bookings...
                                    </td>
                                </tr>
                            ) : filteredBookings.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-500">
                                        No bookings match the current search or filters.
                                    </td>
                                </tr>
                            ) : filteredBookings.map((booking) => (
                                <tr key={booking.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4">
                                        <p className="text-sm font-bold text-slate-900">#{booking.id}</p>
                                        <p className="mt-1 max-w-[220px] truncate text-xs text-slate-500">
                                            {booking.bookingDetailsText || 'No extra booking notes.'}
                                        </p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-sm font-bold text-slate-900">{booking.patientName}</p>
                                        <p className="mt-1 text-xs text-slate-500">{booking.patientEmail}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-sm font-bold text-slate-900">{booking.doctorName}</p>
                                        <p className="mt-1 text-xs text-slate-500">{booking.specialtyName}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-sm font-semibold text-slate-700">{booking.appointmentDateLabel}</p>
                                        <p className="mt-1 text-xs text-slate-500">{booking.timeLabel}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-sm font-semibold text-slate-700">{booking.createdDateLabel}</p>
                                        <p className="mt-1 text-xs text-slate-500">Sorted by created time.</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-sm font-semibold text-slate-700">{booking.paymentMethodLabel}</p>
                                        <p className="mt-1 text-xs text-slate-500">{formatPaymentStatusLabel(booking.paymentStatus)}</p>
                                        {booking.paymentAmount !== null && (
                                            <p className="mt-1 text-xs font-bold text-slate-400">
                                                {formatMinorCurrency(booking.paymentAmount, booking.paymentCurrency)}
                                            </p>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${booking.statusChipClass}`}>
                                            {booking.statusLabel}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </AdminShell>
    );
};

export default BookingManagement;
