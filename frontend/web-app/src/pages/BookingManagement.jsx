import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAdminBookings, clearError } from '../store/slices/bookingSlice';
import AdminShell from '../components/layout/AdminShell';
import dayjs from 'dayjs';

const BookingManagement = () => {
    const dispatch = useDispatch();
    const { bookings, loading, error } = useSelector((state) => state.booking);

    useEffect(() => {
        dispatch(fetchAdminBookings());
    }, [dispatch]);

    const getStatusMeta = (booking) => {
        switch (booking.statusId) {
            case 'S2':
                return { label: 'Cancelled', className: 'bg-red-100 text-red-700' };
            case 'S3':
                return { label: 'Done', className: 'bg-emerald-100 text-emerald-700' };
            case 'S4':
                return { label: 'No-show', className: 'bg-amber-100 text-amber-700' };
            default:
                if (booking.confirmedAt) {
                    return { label: 'Confirmed', className: 'bg-blue-100 text-blue-700' };
                }
                return { label: 'New', className: 'bg-slate-100 text-slate-700' };
        }
    };

    return (
        <AdminShell searchPlaceholder="Search bookings (disabled in read-only)...">
            {error && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <span className="material-symbols-outlined text-base">error</span>
                    <span>{error}</span>
                    <button
                        onClick={() => dispatch(clearError())}
                        className="ml-auto text-red-500 hover:text-red-700"
                    >
                        <span className="material-symbols-outlined text-base">close</span>
                    </button>
                </div>
            )}

            <section className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-3xl font-black tracking-tight">Booking Management</h1>
                    <p className="mt-1 text-sm text-slate-500">View all system appointments across clinics.</p>
                </div>
            </section>

            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm mt-6">
                {loading ? (
                    <div className="py-16 text-center text-slate-500">Loading bookings...</div>
                ) : bookings.length === 0 ? (
                    <div className="py-16 text-center text-slate-400">No bookings found.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[900px] text-left">
                            <thead className="border-b border-slate-200 bg-slate-50">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Patient</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Doctor</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Appointment Date</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Time</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {bookings.map((booking) => {
                                    const status = getStatusMeta(booking);

                                    return (
                                    <tr key={booking.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-bold">{booking.patient?.name || 'Unknown'}</p>
                                            <p className="text-xs text-slate-500">{booking.patientContactEmail || booking.patient?.email}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-bold text-slate-700">{booking.doctor?.name || 'Unknown'}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <span className="material-symbols-outlined text-[18px] text-slate-400">event</span>
                                                <span className="text-sm font-medium">{dayjs(booking.date).format('MMMM D, YYYY')}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-medium text-slate-600">{booking.timeType}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${status.className}`}>
                                                {status.label}
                                            </span>
                                        </td>
                                    </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </AdminShell>
    );
};

export default BookingManagement;
