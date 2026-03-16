import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    cancelDoctorBooking,
    clearScheduleError,
    fetchDoctorBookings,
    fetchDoctorSchedules,
    markDoctorBookingDone,
    markDoctorBookingNoShow,
    saveDoctorSchedules,
} from '../store/slices/scheduleSlice';
import apiClient from '../utils/apiClient';
import { readAllcodeCache, writeAllcodeCache } from '../utils/allcodeCache';
import { compareTimeType, DEFAULT_TIME_LABELS, TIME_CODES } from '../utils/timeSlots';

const STATUS_LABELS = {
    S1: { text: 'New', className: 'bg-blue-100 text-blue-700' },
    S2: { text: 'Cancelled', className: 'bg-red-100 text-red-700' },
    S3: { text: 'Done', className: 'bg-emerald-100 text-emerald-700' },
    S4: { text: 'No-show', className: 'bg-amber-100 text-amber-700' },
};

const DoctorDashboard = () => {
    const dispatch = useDispatch();
    const { schedules, bookings, loadingSchedules, loadingBookings, submitting, error } = useSelector((state) => state.schedule);
    const { user } = useSelector((state) => state.auth);

    const [timeLabels, setTimeLabels] = React.useState({});
    const [selectedDate, setSelectedDate] = React.useState(() => new Date().toLocaleDateString('en-CA'));
    const [selectedTimeTypes, setSelectedTimeTypes] = React.useState([]);
    const [actionLoading, setActionLoading] = React.useState(null);

    React.useEffect(() => {
        if (!selectedDate) return;
        dispatch(fetchDoctorSchedules({ date: selectedDate }));
    }, [dispatch, selectedDate]);

    React.useEffect(() => {
        if (!loadingBookings && bookings.length === 0) {
            dispatch(fetchDoctorBookings());
        }
    }, [dispatch, loadingBookings, bookings.length]);

    React.useEffect(() => {
        const loadTimeLabels = async () => {
            try {
                const cached = readAllcodeCache('TIME');
                const response = cached
                    ? { data: cached }
                    : await apiClient.get('/allcodes', { params: { type: 'TIME' } });
                if (!cached && Array.isArray(response.data)) {
                    writeAllcodeCache('TIME', response.data);
                }
                const labels = {};
                for (const code of response.data) {
                    labels[code.key] = code.valueEn;
                }
                setTimeLabels(labels);
            } catch {
                setTimeLabels({ ...DEFAULT_TIME_LABELS });
            }
        };

        loadTimeLabels();
    }, []);

    const toggleTimeType = (timeType) => {
        const slot = schedules.find((item) => item.timeType === timeType);
        if (slot?.currentNumber > 0) {
            return;
        }

        setSelectedTimeTypes((prev) =>
            prev.includes(timeType)
                ? prev.filter((item) => item !== timeType)
                : [...prev, timeType]
        );
    };

    const handleSaveSchedules = async (e) => {
        e.preventDefault();
        const result = await dispatch(
            saveDoctorSchedules({
                date: selectedDate,
                enabledTimeTypes: selectedTimeTypes,
            })
        );

        if (saveDoctorSchedules.fulfilled.match(result)) {
            dispatch(fetchDoctorSchedules({ date: selectedDate }));
        }
    };

    const executeBookingAction = async (type, id) => {
        setActionLoading(`${type}-${id}`);
        if (type === 'cancel') await dispatch(cancelDoctorBooking(id));
        if (type === 'done') await dispatch(markDoctorBookingDone(id));
        if (type === 'noshow') await dispatch(markDoctorBookingNoShow(id));
        setActionLoading(null);
    };

    React.useEffect(() => {
        if (!schedules || schedules.length === 0) {
            setSelectedTimeTypes([...TIME_CODES]);
            return;
        }
        const activeCodes = schedules
            .filter((slot) => slot.isActive !== false)
            .map((slot) => slot.timeType)
            .sort(compareTimeType);
        setSelectedTimeTypes(activeCodes);
    }, [schedules]);

    return (
        <div className="min-h-screen bg-background-light text-slate-900">
            <main className="max-w-6xl mx-auto px-4 py-6 sm:px-8 space-y-8">
                <header>
                    <h1 className="text-3xl font-black">Doctor Dashboard</h1>
                    <p className="text-slate-500">Welcome {user?.name}. Create schedules and manage appointments.</p>
                </header>

                {error && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm flex items-center justify-between">
                        <span>{error}</span>
                        <button onClick={() => dispatch(clearScheduleError())} className="font-black">x</button>
                    </div>
                )}

                <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
                    <h2 className="text-xl font-black">Create Schedule</h2>
                    <form onSubmit={handleSaveSchedules} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold mb-1">Date</label>
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold mb-2">Available Time Slots (30 minutes each)</label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {TIME_CODES.map((timeType) => (
                                    (() => {
                                        const slot = schedules.find((item) => item.timeType === timeType);
                                        const isBooked = (slot?.currentNumber || 0) > 0;
                                        const isSelected = selectedTimeTypes.includes(timeType);
                                        return (
                                            <button
                                                key={timeType}
                                                type="button"
                                                onClick={() => toggleTimeType(timeType)}
                                                className={`rounded-lg border px-2 py-2 text-xs font-bold ${
                                                    isBooked
                                                        ? 'border-amber-300 bg-amber-50 text-amber-700'
                                                        : isSelected
                                                            ? 'bg-primary text-white border-primary'
                                                            : 'bg-white border-slate-300 text-slate-700'
                                                }`}
                                                title={isBooked ? 'This slot already has a booking and cannot be disabled.' : ''}
                                            >
                                                {timeLabels[timeType] || timeType}
                                                {isBooked ? ' (Booked)' : ''}
                                            </button>
                                        );
                                    })()
                                ))}
                            </div>
                            <p className="mt-2 text-xs text-slate-500">Selected slots are open for booking. Unselected slots are disabled for this date.</p>
                        </div>

                        <button
                            type="submit"
                            disabled={!selectedDate || submitting}
                            className="px-4 py-2 rounded-lg bg-primary text-white font-black disabled:opacity-60"
                        >
                            {submitting ? 'Saving...' : 'Save Schedule'}
                        </button>
                    </form>
                </section>

                <section className="rounded-xl border border-slate-200 bg-white p-5">
                    <h2 className="text-xl font-black mb-3">Schedule Overview ({selectedDate})</h2>
                    {loadingSchedules ? (
                        <p className="text-slate-500">Loading schedules...</p>
                    ) : schedules.length === 0 ? (
                        <p className="text-slate-500">No schedules yet.</p>
                    ) : (
                        <div className="space-y-2">
                            {schedules
                                .slice()
                                .sort((a, b) => compareTimeType(a.timeType, b.timeType))
                                .map((schedule) => (
                                    <div key={`${schedule.date}-${schedule.timeType}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 p-3">
                                        <div className="text-sm">
                                            <p className="font-bold">{schedule.date} - {timeLabels[schedule.timeType] || schedule.timeType}</p>
                                            <p className="text-slate-500">
                                                {schedule.currentNumber > 0
                                                    ? 'Booked'
                                                    : schedule.isActive === false
                                                        ? 'Disabled'
                                                        : 'Available'}
                                            </p>
                                        </div>
                                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                                            schedule.currentNumber > 0
                                                ? 'bg-amber-100 text-amber-700'
                                                : schedule.isActive === false
                                                    ? 'bg-slate-100 text-slate-600'
                                                    : 'bg-emerald-100 text-emerald-700'
                                        }`}>
                                            {schedule.currentNumber > 0 ? 'Booked' : schedule.isActive === false ? 'Disabled' : 'Open'}
                                        </span>
                                    </div>
                                ))}
                        </div>
                    )}
                </section>

                <section className="rounded-xl border border-slate-200 bg-white p-5">
                    <h2 className="text-xl font-black mb-3">My Appointments</h2>
                    {loadingBookings ? (
                        <p className="text-slate-500">Loading appointments...</p>
                    ) : bookings.length === 0 ? (
                        <p className="text-slate-500">No appointments yet.</p>
                    ) : (
                        <div className="space-y-3">
                            {bookings.map((booking) => {
                                const status = STATUS_LABELS[booking.statusId] || { text: booking.statusId, className: 'bg-slate-100 text-slate-700' };
                                return (
                                    <div key={booking.id} className="rounded-lg border border-slate-200 p-4">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <p className="font-black">Booking #{booking.id}</p>
                                            <span className={`px-2 py-1 rounded-full text-xs font-black ${status.className}`}>{status.text}</span>
                                        </div>
                                        <div className="text-sm text-slate-600 mt-2">
                                            <p>Patient ID: {booking.patientId}</p>
                                            <p>Date: {booking.date}</p>
                                            <p>Time Slot: {booking.timeType}</p>
                                        </div>
                                        {booking.statusId === 'S1' && (
                                            <div className="flex flex-wrap gap-2 mt-3">
                                                <button
                                                    onClick={() => executeBookingAction('cancel', booking.id)}
                                                    disabled={actionLoading === `cancel-${booking.id}`}
                                                    className="px-3 py-2 rounded-lg bg-red-100 text-red-700 text-xs font-bold disabled:opacity-60"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={() => executeBookingAction('done', booking.id)}
                                                    disabled={actionLoading === `done-${booking.id}`}
                                                    className="px-3 py-2 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-bold disabled:opacity-60"
                                                >
                                                    Mark Done
                                                </button>
                                                <button
                                                    onClick={() => executeBookingAction('noshow', booking.id)}
                                                    disabled={actionLoading === `noshow-${booking.id}`}
                                                    className="px-3 py-2 rounded-lg bg-amber-100 text-amber-700 text-xs font-bold disabled:opacity-60"
                                                >
                                                    No-show
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
};

export default DoctorDashboard;
