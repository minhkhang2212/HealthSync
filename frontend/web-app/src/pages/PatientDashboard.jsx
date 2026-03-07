import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logoutUser } from '../store/slices/authSlice';
import { fetchSpecialties } from '../store/slices/specialtySlice';
import { fetchDoctors } from '../store/slices/doctorSlice';
import { cancelBooking, fetchBookings } from '../store/slices/bookingSlice';

const STATUS_LABELS = {
    S1: { text: 'New', className: 'bg-blue-100 text-blue-700' },
    S2: { text: 'Cancelled', className: 'bg-red-100 text-red-700' },
    S3: { text: 'Done', className: 'bg-emerald-100 text-emerald-700' },
    S4: { text: 'No-show', className: 'bg-amber-100 text-amber-700' },
};

const PatientDashboard = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { user } = useSelector((state) => state.auth);
    const { specialties } = useSelector((state) => state.specialty);
    const { doctors, loading: loadingDoctors } = useSelector((state) => state.doctor);
    const { bookings, loading: loadingBookings, error: bookingError } = useSelector((state) => state.booking);

    const [view, setView] = React.useState('home');
    const [specialtyFilter, setSpecialtyFilter] = React.useState(null);
    const [actionLoadingId, setActionLoadingId] = React.useState(null);

    React.useEffect(() => {
        dispatch(fetchSpecialties());
        dispatch(fetchBookings());
    }, [dispatch]);

    React.useEffect(() => {
        const params = specialtyFilter ? { specialtyId: specialtyFilter } : {};
        dispatch(fetchDoctors(params));
    }, [dispatch, specialtyFilter]);

    const handleLogout = async () => {
        await dispatch(logoutUser());
        navigate('/login');
    };

    const handleCancelBooking = async (id) => {
        setActionLoadingId(id);
        const result = await dispatch(cancelBooking(id));
        setActionLoadingId(null);
        if (cancelBooking.fulfilled.match(result)) {
            dispatch(fetchBookings());
        }
    };

    return (
        <div className="min-h-screen bg-background-light text-slate-900">
            <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-3 sm:px-8">
                <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="size-9 rounded-lg bg-primary text-white grid place-items-center">
                            <span className="material-symbols-outlined">health_and_safety</span>
                        </div>
                        <div>
                            <p className="font-black text-lg leading-none">HealthSync</p>
                            <p className="text-xs text-slate-500">Patient Portal</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setView('home')}
                            className={`px-3 py-2 rounded-lg text-sm font-bold ${view === 'home' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-700'}`}
                        >
                            Home
                        </button>
                        <button
                            onClick={() => setView('appointments')}
                            className={`px-3 py-2 rounded-lg text-sm font-bold ${view === 'appointments' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-700'}`}
                        >
                            My Appointments
                        </button>
                        <button
                            onClick={handleLogout}
                            className="px-3 py-2 rounded-lg text-sm font-bold bg-red-100 text-red-700"
                            title="Sign out"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-4 py-6 sm:px-8">
                {view === 'home' && (
                    <div className="space-y-8">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-black">Welcome, {user?.name}</h1>
                            <p className="text-slate-500">Choose a specialty and book with a doctor.</p>
                        </div>

                        <section className="space-y-3">
                            <h2 className="text-lg font-black">Specialties</h2>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() => setSpecialtyFilter(null)}
                                    className={`px-3 py-2 rounded-lg text-sm font-bold ${specialtyFilter === null ? 'bg-primary text-white' : 'bg-white border border-slate-200'}`}
                                >
                                    All
                                </button>
                                {specialties.map((specialty) => (
                                    <button
                                        key={specialty.id}
                                        onClick={() => setSpecialtyFilter(specialty.id)}
                                        className={`px-3 py-2 rounded-lg text-sm font-bold ${specialtyFilter === specialty.id ? 'bg-primary text-white' : 'bg-white border border-slate-200'}`}
                                    >
                                        {specialty.name}
                                    </button>
                                ))}
                            </div>
                        </section>

                        <section className="space-y-3">
                            <h2 className="text-lg font-black">Doctors</h2>
                            {loadingDoctors ? (
                                <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-500">Loading doctors...</div>
                            ) : doctors.length === 0 ? (
                                <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-500">No doctors found.</div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {doctors.map((doctor) => {
                                        const mapping = doctor.doctor_clinic_specialties?.[0];
                                        const clinicName = mapping?.clinic?.name || doctor.doctor_infor?.nameClinic || 'Clinic updating';
                                        const specialtyName = mapping?.specialty?.name || 'Specialty updating';

                                        return (
                                            <Link
                                                key={doctor.id}
                                                to={`/patient/doctor/${doctor.id}`}
                                                className="rounded-xl border border-slate-200 bg-white p-4 hover:border-primary transition-colors"
                                            >
                                                <p className="font-black text-lg">{doctor.name}</p>
                                                <p className="text-sm text-primary font-bold">{specialtyName}</p>
                                                <p className="text-sm text-slate-500 mt-1">{clinicName}</p>
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </section>
                    </div>
                )}

                {view === 'appointments' && (
                    <div className="space-y-4">
                        <h1 className="text-2xl sm:text-3xl font-black">My Appointments</h1>
                        {bookingError && (
                            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{bookingError}</div>
                        )}
                        {loadingBookings ? (
                            <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-500">Loading appointments...</div>
                        ) : bookings.length === 0 ? (
                            <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-500">No appointments yet.</div>
                        ) : (
                            <div className="space-y-3">
                                {bookings.map((booking) => {
                                    const status = STATUS_LABELS[booking.statusId] || { text: booking.statusId, className: 'bg-slate-100 text-slate-700' };

                                    return (
                                        <div key={booking.id} className="rounded-xl border border-slate-200 bg-white p-4">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <p className="font-black">Booking #{booking.id}</p>
                                                <span className={`px-2 py-1 rounded-full text-xs font-black ${status.className}`}>{status.text}</span>
                                            </div>
                                            <div className="mt-2 text-sm text-slate-600">
                                                <p>Doctor ID: {booking.doctorId}</p>
                                                <p>Date: {booking.date}</p>
                                                <p>Time Slot: {booking.timeType}</p>
                                            </div>
                                            {booking.statusId === 'S1' && (
                                                <button
                                                    onClick={() => handleCancelBooking(booking.id)}
                                                    disabled={actionLoadingId === booking.id}
                                                    className="mt-3 px-3 py-2 rounded-lg bg-red-100 text-red-700 text-sm font-bold disabled:opacity-60"
                                                >
                                                    {actionLoadingId === booking.id ? 'Cancelling...' : 'Cancel Appointment'}
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
};

export default PatientDashboard;
