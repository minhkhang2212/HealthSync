import React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { createBooking } from '../store/slices/bookingSlice';
import { fetchDoctorAvailability, fetchDoctorById } from '../store/slices/doctorSlice';
import apiClient from '../utils/apiClient';
import { readAllcodeCache, writeAllcodeCache } from '../utils/allcodeCache';
import { compareTimeType, DEFAULT_TIME_LABELS } from '../utils/timeSlots';

const DoctorDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { selectedDoctor, availability, loading, error } = useSelector((state) => state.doctor);
    const { loading: bookingLoading, error: bookingError } = useSelector((state) => state.booking);

    const [selectedDate, setSelectedDate] = React.useState('');
    const [selectedTime, setSelectedTime] = React.useState('');
    const [timeLabels, setTimeLabels] = React.useState(DEFAULT_TIME_LABELS);
    const [successMessage, setSuccessMessage] = React.useState('');

    React.useEffect(() => {
        if (!id) return;

        dispatch(fetchDoctorById(id));
        dispatch(fetchDoctorAvailability({ id }));
    }, [dispatch, id]);

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
                const map = { ...DEFAULT_TIME_LABELS };
                for (const code of response.data) {
                    map[code.key] = code.valueEn;
                }
                setTimeLabels(map);
            } catch {
                setTimeLabels(DEFAULT_TIME_LABELS);
            }
        };

        loadTimeLabels();
    }, []);

    React.useEffect(() => {
        if (availability.length === 0) {
            setSelectedDate('');
            setSelectedTime('');
            return;
        }

        const firstAvailableDate = [...new Set(availability.map((slot) => slot.date))][0];
        setSelectedDate((prev) => prev || firstAvailableDate);
    }, [availability]);

    const availableDates = React.useMemo(
        () => [...new Set(availability.map((slot) => slot.date))],
        [availability]
    );

    const selectedDateSlots = React.useMemo(
        () => availability
            .filter((slot) => slot.date === selectedDate && slot.currentNumber < 1 && slot.isActive !== false)
            .sort((a, b) => compareTimeType(a.timeType, b.timeType)),
        [availability, selectedDate]
    );

    const handleCreateBooking = async () => {
        if (!selectedDate || !selectedTime) return;

        const result = await dispatch(
            createBooking({
                doctorId: Number(id),
                date: selectedDate,
                timeType: selectedTime,
            })
        );

        if (createBooking.fulfilled.match(result)) {
            setSuccessMessage('Booking created successfully.');
            setSelectedTime('');
            dispatch(fetchDoctorAvailability({ id }));
            setTimeout(() => navigate('/patient'), 700);
        }
    };

    const mapping = selectedDoctor?.doctor_clinic_specialties?.[0];
    const clinicName = mapping?.clinic?.name || selectedDoctor?.doctor_infor?.nameClinic || 'Clinic updating';
    const specialtyName = mapping?.specialty?.name || 'Specialty updating';

    return (
        <div className="min-h-screen bg-background-light text-slate-900">
            <div className="max-w-5xl mx-auto px-4 py-6 sm:px-8 space-y-6">
                <Link to="/patient" className="text-primary font-bold text-sm">&larr; Back to doctors</Link>

                {loading ? (
                    <div className="rounded-xl bg-white border border-slate-200 p-6 text-center text-slate-500">Loading doctor profile...</div>
                ) : error ? (
                    <div className="rounded-xl bg-red-50 border border-red-200 p-6 text-red-700">{error}</div>
                ) : !selectedDoctor ? (
                    <div className="rounded-xl bg-white border border-slate-200 p-6 text-slate-500">Doctor not found.</div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <section className="lg:col-span-2 rounded-xl bg-white border border-slate-200 p-6">
                            <p className="text-sm font-bold text-primary">{specialtyName}</p>
                            <h1 className="text-3xl font-black mt-1">{selectedDoctor.name}</h1>
                            <p className="text-slate-500 mt-1">{clinicName}</p>

                            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                <div className="rounded-lg bg-slate-50 p-4 border border-slate-200">
                                    <p className="text-slate-500">Email</p>
                                    <p className="font-bold">{selectedDoctor.email}</p>
                                </div>
                                <div className="rounded-lg bg-slate-50 p-4 border border-slate-200">
                                    <p className="text-slate-500">Phone</p>
                                    <p className="font-bold">{selectedDoctor.phoneNumber || '-'}</p>
                                </div>
                            </div>
                        </section>

                        <aside className="rounded-xl bg-white border border-slate-200 p-6 space-y-4">
                            <h2 className="text-xl font-black">Book Appointment</h2>

                            {successMessage && (
                                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-700 text-sm">{successMessage}</div>
                            )}
                            {bookingError && (
                                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700 text-sm">{bookingError}</div>
                            )}

                            <div>
                                <label className="block text-sm font-bold mb-1">Date</label>
                                <select
                                    value={selectedDate}
                                    onChange={(e) => {
                                        setSelectedDate(e.target.value);
                                        setSelectedTime('');
                                    }}
                                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                                >
                                    <option value="">Select date</option>
                                    {availableDates.map((date) => (
                                        <option key={date} value={date}>{date}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold mb-1">Time Slot</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {selectedDateSlots.map((slot) => (
                                        <button
                                            key={slot.id}
                                            type="button"
                                            onClick={() => setSelectedTime(slot.timeType)}
                                            className={`rounded-lg border px-2 py-2 text-xs font-bold ${
                                                selectedTime === slot.timeType
                                                    ? 'bg-primary text-white border-primary'
                                                    : 'bg-white border-slate-300 text-slate-700'
                                            }`}
                                        >
                                            {timeLabels[slot.timeType] || slot.timeType}
                                        </button>
                                    ))}
                                </div>
                                {selectedDate && selectedDateSlots.length === 0 && (
                                    <p className="text-sm text-slate-500 mt-2">No available slots for this date.</p>
                                )}
                            </div>

                            <button
                                onClick={handleCreateBooking}
                                disabled={!selectedDate || !selectedTime || bookingLoading}
                                className="w-full rounded-lg bg-primary text-white font-black py-3 disabled:opacity-60"
                            >
                                {bookingLoading ? 'Booking...' : 'Confirm Booking'}
                            </button>
                        </aside>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DoctorDetail;
