import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    clearScheduleError,
    fetchDoctorSchedules,
    saveDoctorSchedules,
} from '../store/slices/scheduleSlice';
import apiClient from '../utils/apiClient';
import { readAllcodeCache, writeAllcodeCache } from '../utils/allcodeCache';
import { compareTimeType, DEFAULT_TIME_LABELS, TIME_CODES } from '../utils/timeSlots';
import DoctorShell from '../components/layout/DoctorShell';

const formatLondonDate = (date) => {
    const parts = new Intl.DateTimeFormat('en', {
        timeZone: 'Europe/London',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(date);

    const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${lookup.year}-${lookup.month}-${lookup.day}`;
};

const DoctorDashboard = () => {
    const dispatch = useDispatch();
    const { schedules, loadingSchedules, submitting, error } = useSelector((state) => state.schedule);
    const { user } = useSelector((state) => state.auth);

    const [timeLabels, setTimeLabels] = React.useState({});
    const [selectedDate, setSelectedDate] = React.useState(() => formatLondonDate(new Date()));
    const [selectedTimeTypes, setSelectedTimeTypes] = React.useState([]);

    const minScheduleDate = React.useMemo(() => formatLondonDate(new Date()), []);
    const maxScheduleDate = React.useMemo(() => {
        const date = new Date();
        date.setDate(date.getDate() + 30);
        return formatLondonDate(date);
    }, []);

    React.useEffect(() => {
        if (!selectedDate) return;
        dispatch(fetchDoctorSchedules({ date: selectedDate }));
    }, [dispatch, selectedDate]);

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

    const handleSaveSchedules = async (event) => {
        event.preventDefault();
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
        <DoctorShell>
            <header>
                <h1 className="text-3xl font-black">Doctor Dashboard</h1>
                <p className="text-slate-500">Welcome {user?.name}. Manage daily availability for the next 30 days.</p>
            </header>

            {error && (
                <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <span>{error}</span>
                    <button onClick={() => dispatch(clearScheduleError())} className="font-black">x</button>
                </div>
            )}

            <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
                <h2 className="text-xl font-black">Manage Daily Availability</h2>
                <form onSubmit={handleSaveSchedules} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label className="mb-1 block text-sm font-bold">Date</label>
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(event) => setSelectedDate(event.target.value)}
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                                min={minScheduleDate}
                                max={maxScheduleDate}
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-bold">Daily Time Slots (30 minutes each)</label>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                            {TIME_CODES.map((timeType) => {
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
                                                    ? 'border-primary bg-primary text-white'
                                                    : 'border-slate-300 bg-white text-slate-700'
                                        }`}
                                        title={isBooked ? 'This slot already has a booking and cannot be disabled.' : ''}
                                    >
                                        {timeLabels[timeType] || timeType}
                                        {isBooked ? ' (Booked)' : ''}
                                    </button>
                                );
                            })}
                        </div>
                        <p className="mt-2 text-xs text-slate-500">
                            All 16 slots are enabled by default for each date. Click a slot to deselect it and close that time for booking.
                        </p>
                    </div>

                    <button
                        type="submit"
                        disabled={!selectedDate || submitting}
                        className="rounded-lg bg-primary px-4 py-2 font-black text-white disabled:opacity-60"
                    >
                        {submitting ? 'Saving...' : 'Save Availability'}
                    </button>
                </form>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5">
                <h2 className="mb-3 text-xl font-black">Schedule Overview ({selectedDate})</h2>
                {loadingSchedules ? (
                    <p className="text-slate-500">Loading schedules...</p>
                ) : schedules.length === 0 ? (
                    <p className="text-slate-500">No schedules yet.</p>
                ) : (
                    <div className="space-y-2">
                        {schedules
                            .slice()
                            .sort((left, right) => compareTimeType(left.timeType, right.timeType))
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
        </DoctorShell>
    );
};

export default DoctorDashboard;
