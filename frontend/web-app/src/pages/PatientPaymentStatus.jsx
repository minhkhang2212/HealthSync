import React from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logoutUser } from '../store/slices/authSlice';
import { resetAiSession } from '../store/slices/aiSlice';
import apiClient from '../utils/apiClient';
import PatientPortalFooter from '../components/layout/PatientPortalFooter';
import PatientPortalHeader from '../components/layout/PatientPortalHeader';
import { PATIENT_PORTAL_ROUTE_TARGETS } from '../components/layout/patientPortalConfig';
import { DEFAULT_TIME_LABELS } from '../utils/timeSlots';
import { getPaymentSummary, normalizePaymentStatus } from '../utils/bookingPayments';

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 8;

const STATUS_META = {
    success: {
        title: 'Payment Received',
        description: 'Your transaction for the doctor booking has been received and is now moving through the next verification steps.',
        icon: 'check',
        iconClassName: 'bg-blue-100 text-primary',
        accentClassName: 'text-primary',
    },
    pending: {
        title: 'Payment Received',
        description: 'Your payment went through, We are updating your booking confirmation now.',
        icon: 'schedule',
        iconClassName: 'bg-amber-100 text-amber-600',
        accentClassName: 'text-amber-600',
    },
    cancelled: {
        title: 'Payment Cancelled',
        description: 'Your online checkout was cancelled. No appointment was confirmed and any temporary reservation has been released.',
        icon: 'close',
        iconClassName: 'bg-red-100 text-red-600',
        accentClassName: 'text-red-600',
    },
    error: {
        title: 'Unable To Verify Payment',
        description: 'We could not load the latest payment result right now. Refresh the page or return to your dashboard to try again.',
        icon: 'help',
        iconClassName: 'bg-slate-200 text-slate-700',
        accentClassName: 'text-slate-700',
    },
};

const NEXT_STEPS = [
    {
        title: 'Payment Verification',
        description: 'Our system confirms your transaction with the payment provider. This usually takes less than 2 minutes.',
    },
    {
        title: 'Clinic Review',
        description: "The clinic administrator reviews the booking and schedules the session into the doctor's calendar.",
    },
    {
        title: 'Dashboard Tracking',
        description: "Once approved, you'll receive a notification. You can track all updates in your personal dashboard.",
    },
];

const formatBookingDateLong = (date) => {
    if (!date) return 'Unknown date';
    const parsed = new Date(`${date}T00:00:00`);

    return Number.isNaN(parsed.getTime())
        ? date
        : parsed.toLocaleDateString('en-GB', {
            weekday: 'long',
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
};

const PatientPaymentStatus = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { bookingId } = useParams();
    const [searchParams] = useSearchParams();
    const { user } = useSelector((state) => state.auth);

    const [booking, setBooking] = React.useState(null);
    const [pageState, setPageState] = React.useState('pending');
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState('');
    const [pollAttempt, setPollAttempt] = React.useState(0);

    const checkoutState = searchParams.get('checkout') || 'success';

    const fetchBooking = React.useCallback(async () => {
        if (!bookingId) return null;
        const response = await apiClient.get(`/patient/bookings/${bookingId}`);
        return response.data;
    }, [bookingId]);

    const applyBookingState = React.useCallback((latestBooking, nextCheckoutState = checkoutState) => {
        if (nextCheckoutState === 'cancelled') {
            setPageState('cancelled');
            return;
        }

        const paymentStatus = normalizePaymentStatus(latestBooking);

        if (paymentStatus === 'paid') {
            setPageState('success');
            return;
        }

        if (paymentStatus === 'pending') {
            setPageState('pending');
            return;
        }

        if (['cancelled', 'expired'].includes(paymentStatus) || latestBooking?.statusId === 'S2') {
            setPageState('cancelled');
            return;
        }

        setPageState('error');
        setError('Unexpected payment status received.');
    }, [checkoutState]);

    const handleRefreshStatus = React.useCallback(async () => {
        setLoading(true);
        setError('');

        try {
            const latestBooking = await fetchBooking();
            setBooking(latestBooking);
            setPollAttempt(0);
            applyBookingState(latestBooking);
        } catch {
            setPageState('error');
            setError('Unable to refresh booking status right now.');
        } finally {
            setLoading(false);
        }
    }, [applyBookingState, fetchBooking]);

    React.useEffect(() => {
        let cancelled = false;

        const initialize = async () => {
            if (!bookingId) {
                setError('Booking reference is missing.');
                setPageState('error');
                setLoading(false);
                return;
            }

            try {
                if (checkoutState === 'cancelled') {
                    try {
                        await apiClient.post(`/patient/bookings/${bookingId}/cancel`);
                    } catch {
                        // Booking may already be cancelled by a previous request or webhook.
                    }
                }

                const latestBooking = await fetchBooking();
                if (cancelled) return;

                setBooking(latestBooking);
                setPollAttempt(0);
                setError('');
                applyBookingState(latestBooking, checkoutState);
            } catch {
                if (cancelled) return;
                setPageState('error');
                setError('Unable to load the payment result right now.');
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        initialize();

        return () => {
            cancelled = true;
        };
    }, [applyBookingState, bookingId, checkoutState, fetchBooking]);

    React.useEffect(() => {
        if (loading || pageState !== 'pending' || pollAttempt >= MAX_POLL_ATTEMPTS) {
            return undefined;
        }

        const timer = window.setTimeout(async () => {
            try {
                const latestBooking = await fetchBooking();
                setBooking(latestBooking);

                const paymentStatus = normalizePaymentStatus(latestBooking);
                if (paymentStatus === 'paid') {
                    setPageState('success');
                    return;
                }

                if (['cancelled', 'expired'].includes(paymentStatus) || latestBooking?.statusId === 'S2') {
                    setPageState('cancelled');
                    return;
                }

                setPollAttempt((previous) => previous + 1);
            } catch {
                setPollAttempt((previous) => previous + 1);
            }
        }, POLL_INTERVAL_MS);

        return () => window.clearTimeout(timer);
    }, [fetchBooking, loading, pageState, pollAttempt]);

    const activeMeta = STATUS_META[pageState] || STATUS_META.pending;
    const paymentSummary = booking ? getPaymentSummary(booking) : null;
    const timeLabel = booking?.timeType ? (DEFAULT_TIME_LABELS[booking.timeType] || booking.timeType) : 'Unknown time slot';
    const isPendingTimeout = pageState === 'pending' && pollAttempt >= MAX_POLL_ATTEMPTS;
    const bookingReference = booking?.id || bookingId || '--';
    const reasonForVisit = booking?.bookingDetails?.reasonForVisit || 'Clinic consultation';

    const navigateToDashboardTarget = React.useCallback((portalTarget) => {
        navigate('/patient', { state: { portalTarget } });
    }, [navigate]);

    const handleLogout = React.useCallback(async () => {
        dispatch(resetAiSession());
        await dispatch(logoutUser());
        navigate('/login');
    }, [dispatch, navigate]);

    return (
        <div className="min-h-screen bg-slate-100 font-['Inter'] text-slate-900">
            <PatientPortalHeader
                user={user}
                activeItem="appointments"
                onHome={() => navigateToDashboardTarget(PATIENT_PORTAL_ROUTE_TARGETS.DASHBOARD)}
                onFindDoctors={() => navigate('/patient/doctors')}
                onClinics={() => navigate('/patient/clinics')}
                onAiSupport={() => navigate('/patient/ai')}
                onAppointments={() => navigateToDashboardTarget(PATIENT_PORTAL_ROUTE_TARGETS.APPOINTMENTS)}
                onLogout={handleLogout}
            />

            <main className="mx-auto w-full max-w-[1240px] px-4 py-8 sm:px-8 sm:py-10">
                <div className="grid gap-8 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,420px)]">
                    <div className="space-y-8">
                        <section className="relative overflow-hidden rounded-[34px] border border-white/70 bg-white px-6 py-10 shadow-[0_28px_70px_-42px_rgba(15,23,42,0.38)] md:px-10">
                            <div className="absolute -right-8 -top-8 h-36 w-36 rounded-full bg-blue-50/80" />
                            <div className="absolute -left-12 bottom-[-72px] h-44 w-44 rounded-full bg-slate-100/80" />

                            <div className="relative flex flex-col items-center text-center">
                                <div className={`grid h-24 w-24 place-items-center rounded-full ${activeMeta.iconClassName}`}>
                                    <span className="material-symbols-outlined text-[46px]">{activeMeta.icon}</span>
                                </div>

                                <h1 className="mt-8 text-[44px] font-black leading-none tracking-tight text-slate-900 md:text-[56px]">
                                    {activeMeta.title}
                                </h1>
                                <p className="mt-4 max-w-3xl text-[19px] leading-8 text-slate-500">
                                    {activeMeta.description}
                                </p>
                                {isPendingTimeout && (
                                    <p className={`mt-4 text-sm font-bold ${activeMeta.accentClassName}`}>
                                        This is taking a little longer than expected. Please refresh shortly or check your dashboard in a moment.
                                    </p>
                                )}
                                {error && !loading && (
                                    <p className="mt-4 rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">
                                        {error}
                                    </p>
                                )}

                                <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
                                    <button
                                        type="button"
                                        onClick={() => navigate('/patient')}
                                        className="inline-flex min-w-[272px] items-center justify-center gap-3 rounded-[18px] bg-primary px-6 py-5 text-[18px] font-black text-white shadow-[0_22px_36px_-22px_rgba(19,127,236,0.95)] transition hover:bg-blue-700"
                                    >
                                        Go to Dashboard
                                        <span className="material-symbols-outlined text-[22px]">arrow_forward</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleRefreshStatus}
                                        disabled={loading}
                                        className="inline-flex min-w-[252px] items-center justify-center gap-3 rounded-[18px] bg-slate-100 px-6 py-5 text-[18px] font-black text-slate-800 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        <span className="material-symbols-outlined text-[20px]">refresh</span>
                                        {loading ? 'Refreshing...' : 'Refresh Status'}
                                    </button>
                                </div>
                            </div>
                        </section>

                        <section className="overflow-hidden rounded-[34px] border border-white/70 bg-white shadow-[0_28px_70px_-42px_rgba(15,23,42,0.38)]">
                            <div className="bg-[#11192d] px-8 py-5">
                                <p className="text-sm font-black uppercase tracking-[0.2em] text-white/75">Transaction Details</p>
                            </div>

                            <div className="space-y-8 px-6 py-8 md:px-10">
                                <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                                    <div>
                                        <p className="text-sm font-black uppercase tracking-[0.16em] text-slate-400">Booking Number</p>
                                        <p className="mt-3 text-[42px] font-black leading-none tracking-tight text-primary">
                                            #{bookingReference}
                                        </p>
                                    </div>

                                    <div className="md:max-w-[320px] md:text-right">
                                        <p className="text-sm font-black uppercase tracking-[0.16em] text-slate-400">Reason For Visit</p>
                                        <p className="mt-3 text-[20px] font-black leading-8 text-slate-900">
                                            {reasonForVisit}
                                        </p>
                                    </div>
                                </div>

                                <div className="h-px bg-slate-200" />

                                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                    <article className="rounded-[24px] bg-slate-50 p-5">
                                        <div className="flex items-center gap-4">
                                            <div className="grid h-14 w-14 place-items-center rounded-2xl border border-slate-200 bg-white text-primary shadow-sm">
                                                <span className="material-symbols-outlined text-[24px]">calendar_month</span>
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-slate-500">Appointment Date</p>
                                                <p className="mt-1 text-[18px] font-black text-slate-900">
                                                    {formatBookingDateLong(booking?.date)}
                                                </p>
                                            </div>
                                        </div>
                                    </article>

                                    <article className="rounded-[24px] bg-slate-50 p-5">
                                        <div className="flex items-center gap-4">
                                            <div className="grid h-14 w-14 place-items-center rounded-2xl border border-slate-200 bg-white text-primary shadow-sm">
                                                <span className="material-symbols-outlined text-[24px]">schedule</span>
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-slate-500">Time Slot</p>
                                                <p className="mt-1 text-[18px] font-black text-slate-900">{timeLabel}</p>
                                            </div>
                                        </div>
                                    </article>

                                    <article className="rounded-[24px] bg-slate-50 p-5">
                                        <div className="flex items-center gap-4">
                                            <div className="grid h-14 w-14 place-items-center rounded-2xl border border-slate-200 bg-white text-primary shadow-sm">
                                                <span className="material-symbols-outlined text-[24px]">credit_card</span>
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-slate-500">Payment</p>
                                                <p className="mt-1 text-[18px] font-black text-slate-900">{paymentSummary?.label || 'Unknown status'}</p>
                                            </div>
                                        </div>
                                    </article>
                                </div>

                                {booking?.doctorId && (
                                    <button
                                        type="button"
                                        onClick={() => navigate(`/patient/doctor/${booking.doctorId}`)}
                                        className="inline-flex items-center gap-2 text-[15px] font-black uppercase tracking-[0.14em] text-primary transition hover:text-blue-700"
                                    >
                                        <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                                        Back to Doctor Profile
                                    </button>
                                )}
                            </div>
                        </section>
                    </div>

                    <aside className="space-y-7">
                        <section className="rounded-[32px] border-t-4 border-primary bg-white px-6 py-8 shadow-[0_24px_54px_-40px_rgba(15,23,42,0.4)] md:px-10">
                            <h2 className="text-[24px] font-black tracking-tight text-slate-900 md:text-[30px]">
                                What Happens Next
                            </h2>

                            <div className="mt-8 space-y-0">
                                {NEXT_STEPS.map((step, index) => (
                                    <div key={step.title} className={`relative pl-16 ${index === NEXT_STEPS.length - 1 ? '' : 'pb-12'}`}>
                                        {index !== NEXT_STEPS.length - 1 && (
                                            <span className="absolute left-[19px] top-12 h-[calc(100%-12px)] w-px bg-blue-100" />
                                        )}
                                        <span className={`absolute left-0 top-0 grid h-10 w-10 place-items-center rounded-full text-base font-black ${
                                            index === 0 ? 'bg-primary text-white' : 'bg-blue-100 text-primary'
                                        }`}>
                                            {index + 1}
                                        </span>
                                        <h3 className="text-[18px] font-black text-slate-900">{step.title}</h3>
                                        <p className="mt-2 text-[17px] leading-9 text-slate-500">
                                            {step.description}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </aside>
                </div>
            </main>

            <section className="w-full bg-white">
                <PatientPortalFooter />
            </section>
        </div>
    );
};

export default PatientPaymentStatus;
