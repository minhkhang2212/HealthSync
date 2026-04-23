import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logoutUser } from '../store/slices/authSlice';
import { resetAiSession } from '../store/slices/aiSlice';
import { fetchSpecialties } from '../store/slices/specialtySlice';
import { fetchDoctors } from '../store/slices/doctorSlice';
import { fetchClinics } from '../store/slices/clinicSlice';
import { cancelBooking, fetchBookings } from '../store/slices/bookingSlice';
import PatientAiEntryCard from '../components/ai/PatientAiEntryCard';
import apiClient, { getApiAssetBase } from '../utils/apiClient';
import { readAllcodeCache, writeAllcodeCache } from '../utils/allcodeCache';
import { canPatientCancelBooking, getPaymentSummary, isOnlinePaymentPending } from '../utils/bookingPayments';
import { DEFAULT_TIME_LABELS, getTimeTypeOrder } from '../utils/timeSlots';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import { BsCheckCircleFill } from 'react-icons/bs';
import PatientPortalFooter from '../components/layout/PatientPortalFooter';
import PatientPortalHeader from '../components/layout/PatientPortalHeader';
import { PATIENT_PORTAL_ROUTE_TARGETS } from '../components/layout/patientPortalConfig';
import PatientDirectorySearchBar from '../components/discover/PatientDirectorySearchBar';
import 'swiper/css';
import 'swiper/css/navigation';

const DEFAULT_STATUS_LABELS = { S1: 'New', S2: 'Cancelled', S3: 'Done', S4: 'No-show' };

const STATUS_BADGE_CLASSES = {
    S1: 'bg-slate-50 text-slate-700 border-slate-200',
    S2: 'bg-red-50 text-red-700 border-red-200',
    S3: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    S4: 'bg-amber-50 text-amber-700 border-amber-200',
};

const CONFIRMED_BADGE_CLASS = 'bg-blue-50 text-blue-700 border-blue-200';

const normalizeId = (value) => (value == null ? '' : String(value));

const bookingSortValue = (booking) => {
    const dateValue = new Date(`${booking.date}T00:00:00`).getTime();
    const slotValue = getTimeTypeOrder(booking.timeType) * 3600000;
    return Number.isNaN(dateValue) ? Number.MAX_SAFE_INTEGER : dateValue + slotValue;
};

const formatBookingDate = (date) => {
    const parsed = new Date(`${date}T00:00:00`);
    return Number.isNaN(parsed.getTime())
        ? date
        : parsed.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
};

const getBookingStatusMeta = (booking, statusLabels) => {
    if (booking.statusId === 'S2') {
        return {
            label: statusLabels.S2 || 'Cancelled',
            className: STATUS_BADGE_CLASSES.S2,
        };
    }

    if (booking.statusId === 'S3') {
        return {
            label: statusLabels.S3 || 'Done',
            className: STATUS_BADGE_CLASSES.S3,
        };
    }

    if (booking.statusId === 'S4') {
        return {
            label: statusLabels.S4 || 'No-show',
            className: STATUS_BADGE_CLASSES.S4,
        };
    }

    if (booking.confirmedAt) {
        return {
            label: 'Confirmed',
            className: CONFIRMED_BADGE_CLASS,
        };
    }

    return {
        label: statusLabels.S1 || 'New',
        className: STATUS_BADGE_CLASSES.S1,
    };
};

const getPatientAppointmentVisual = (booking, paymentSummary) => {
    if (booking.statusId === 'S2') {
        return {
            icon: 'cancel',
            bubbleClass: 'bg-red-50 text-red-600',
            articleClass: 'opacity-85',
        };
    }

    if (booking.statusId === 'S3') {
        return {
            icon: 'check_circle',
            bubbleClass: 'bg-emerald-50 text-emerald-600',
            articleClass: '',
        };
    }

    if (booking.statusId === 'S4') {
        return {
            icon: 'person_off',
            bubbleClass: 'bg-amber-50 text-amber-600',
            articleClass: '',
        };
    }

    if (booking.confirmedAt) {
        return {
            icon: 'calendar_today',
            bubbleClass: 'bg-blue-50 text-primary',
            articleClass: '',
        };
    }

    if (paymentSummary.tone === 'pending') {
        return {
            icon: 'payments',
            bubbleClass: 'bg-amber-50 text-amber-600',
            articleClass: '',
        };
    }

    return {
        icon: 'schedule',
        bubbleClass: 'bg-slate-100 text-slate-500',
        articleClass: '',
    };
};

const resolveDoctorAppointmentMeta = (doctor) => {
    const mapping = doctor?.doctor_clinic_specialties?.[0];

    return {
        specialtyName: mapping?.specialty?.name || 'Specialty updating',
        clinicName: mapping?.clinic?.name || doctor?.doctor_infor?.nameClinic || 'Clinic updating',
        doctorEmail: doctor?.email || 'Clinic contact updating',
    };
};

const SPECIALTY_VISUALS = [
    { keywords: ['cardio', 'heart', 'tim mach'], icon: 'favorite', subtitle: 'Heart Health', iconTone: 'text-rose-600', bubbleTone: 'bg-rose-50' },
    { keywords: ['derma', 'skin', 'da lieu'], icon: 'dermatology', subtitle: 'Skin Care', iconTone: 'text-amber-600', bubbleTone: 'bg-amber-50' },
    { keywords: ['neuro', 'brain', 'than kinh'], icon: 'neurology', subtitle: 'Brain & Nerves', iconTone: 'text-violet-600', bubbleTone: 'bg-violet-50' },
    { keywords: ['pedia', 'child', 'nhi'], icon: 'child_care', subtitle: "Children's Health", iconTone: 'text-blue-600', bubbleTone: 'bg-blue-50' },
    { keywords: ['dental', 'tooth', 'rang'], icon: 'dentistry', subtitle: 'Oral Care', iconTone: 'text-cyan-600', bubbleTone: 'bg-cyan-50' },
    { keywords: ['eye', 'ophthal'], icon: 'visibility', subtitle: 'Vision Care', iconTone: 'text-sky-600', bubbleTone: 'bg-sky-50' },
    { keywords: ['ortho', 'bone', 'xuong'], icon: 'accessibility_new', subtitle: 'Bone & Joint', iconTone: 'text-lime-600', bubbleTone: 'bg-lime-50' },
];

const FALLBACK_SPECIALTY_THEMES = [
    { iconTone: 'text-indigo-600', bubbleTone: 'bg-indigo-50' },
    { iconTone: 'text-emerald-600', bubbleTone: 'bg-emerald-50' },
    { iconTone: 'text-orange-600', bubbleTone: 'bg-orange-50' },
    { iconTone: 'text-fuchsia-600', bubbleTone: 'bg-fuchsia-50' },
    { iconTone: 'text-cyan-600', bubbleTone: 'bg-cyan-50' },
];

const normalizeSearchText = (value) =>
    String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();

const resolveSpecialtyVisual = (specialty) => {
    const searchText = normalizeSearchText(specialty?.name);
    const matched = SPECIALTY_VISUALS.find((item) => item.keywords.some((keyword) => searchText.includes(keyword)));
    if (matched) return matched;

    const numericId = Number.parseInt(String(specialty?.id || 0), 10) || 0;
    const fallback = FALLBACK_SPECIALTY_THEMES[Math.abs(numericId) % FALLBACK_SPECIALTY_THEMES.length];
    return {
        icon: 'medical_services',
        subtitle: 'General Care',
        iconTone: fallback.iconTone,
        bubbleTone: fallback.bubbleTone,
    };
};

const HOW_IT_WORKS_STEPS = [
    {
        icon: 'search',
        title: '1. Explore Directory',
        description: 'Open the discovery directory to browse specialties, clinics, and doctors from one place.',
    },
    {
        icon: 'calendar_month',
        title: '2. Choose Appointment',
        description: 'Browse doctor profiles and choose an available date and time that fits your schedule.',
    },
    {
        icon: 'verified_user',
        title: '3. Secure Booking',
        description: 'Confirm your booking instantly and receive reminders for upcoming appointments.',
    },
];

const resolveNextAvailableLabel = (doctor) => {
    const candidates = [
        doctor?.nextAvailable,
        doctor?.next_available,
        doctor?.doctor_infor?.nextAvailable,
        doctor?.doctor_infor?.next_available,
        doctor?.doctor_infor?.availableDate,
        doctor?.doctor_infor?.available_date,
    ];

    const raw = candidates.find((value) => typeof value === 'string' && value.trim());
    if (!raw) return 'Today';

    const trimmed = raw.trim();
    const normalized = trimmed.toLowerCase();
    if (normalized === 'today') return 'Today';
    if (normalized === 'tomorrow') return 'Tomorrow';

    const parsed = new Date(trimmed.length <= 10 ? `${trimmed}T00:00:00` : trimmed);
    if (Number.isNaN(parsed.getTime())) return trimmed;

    const now = new Date();
    if (parsed.toDateString() === now.toDateString()) return 'Today';

    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    if (parsed.toDateString() === tomorrow.toDateString()) return 'Tomorrow';

    return parsed.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' });
};

const resolveImageSource = (value, apiAssetBase) => {
    if (!value || typeof value !== 'string') return null;
    const trimmed = value.trim().replace(/\\/g, '/');
    if (!trimmed) return null;
    if (trimmed.startsWith('data:') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
    if (trimmed.startsWith('/')) return apiAssetBase ? `${apiAssetBase}${trimmed}` : trimmed;

    const isStorageLikePath =
        trimmed.startsWith('storage/') ||
        trimmed.startsWith('public/') ||
        trimmed.startsWith('uploads/') ||
        trimmed.startsWith('doctors/') ||
        trimmed.startsWith('clinics/') ||
        trimmed.startsWith('specialties/');

    const hasImageExtension = /\.(png|jpe?g|gif|webp|svg|bmp|avif)(\?.*)?$/i.test(trimmed);
    if (isStorageLikePath || hasImageExtension) {
        if (trimmed.startsWith('storage/')) return apiAssetBase ? `${apiAssetBase}/${trimmed}` : `/${trimmed}`;
        if (trimmed.startsWith('public/storage/')) {
            const publicStoragePath = trimmed.replace(/^public/, '');
            return apiAssetBase ? `${apiAssetBase}${publicStoragePath}` : publicStoragePath;
        }
        const normalizedPath = trimmed.startsWith('public/') ? trimmed.replace(/^public\//, '') : trimmed;
        const storagePath = `/storage/${normalizedPath}`;
        return apiAssetBase ? `${apiAssetBase}${storagePath}` : storagePath;
    }

    return `data:image/jpeg;base64,${trimmed}`;
};

const PatientDashboard = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    const doctorsRef = React.useRef(null);

    const { user } = useSelector((state) => state.auth);
    const { specialties, loading: loadingSpecialties, error: specialtyError } = useSelector((state) => state.specialty);
    const { clinics, loading: loadingClinics, error: clinicError } = useSelector((state) => state.clinic);
    const { doctors, loading: loadingDoctors, error: doctorError } = useSelector((state) => state.doctor);
    const { bookings, loading: loadingBookings, error: bookingError } = useSelector((state) => state.booking);

    const [view, setView] = React.useState('dashboard');
    const [actionLoadingId, setActionLoadingId] = React.useState(null);
    const [statusLabels, setStatusLabels] = React.useState(DEFAULT_STATUS_LABELS);
    const [timeLabels, setTimeLabels] = React.useState(DEFAULT_TIME_LABELS);
    const [showAllSpecialties, setShowAllSpecialties] = React.useState(false);

    const apiAssetBase = React.useMemo(() => getApiAssetBase(), []);

    React.useEffect(() => {
        if (!loadingSpecialties && specialties.length === 0) {
            dispatch(fetchSpecialties());
        }
        if (!loadingClinics && clinics.length === 0) {
            dispatch(fetchClinics());
        }
        if (!loadingDoctors && doctors.length === 0) {
            dispatch(fetchDoctors());
        }
        if (!loadingBookings && bookings.length === 0) {
            dispatch(fetchBookings());
        }
    }, [
        dispatch,
        loadingSpecialties,
        specialties.length,
        loadingClinics,
        clinics.length,
        loadingDoctors,
        doctors.length,
        loadingBookings,
        bookings.length,
    ]);

    React.useEffect(() => {
        const loadCodeMaps = async () => {
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

                const nextStatus = {};
                const nextTime = {};
                for (const item of statusRes.data || []) if (item?.key) nextStatus[item.key] = item.valueEn || item.key;
                for (const item of timeRes.data || []) if (item?.key) nextTime[item.key] = item.valueEn || item.key;
                if (Object.keys(nextStatus).length > 0) setStatusLabels(nextStatus);
                if (Object.keys(nextTime).length > 0) setTimeLabels(nextTime);
            } catch {
                setStatusLabels(DEFAULT_STATUS_LABELS);
                setTimeLabels(DEFAULT_TIME_LABELS);
            }
        };

        loadCodeMaps();
    }, []);

    React.useEffect(() => {
        const portalTarget = location.state?.portalTarget;
        const prefill = location.state?.aiPrefill;
        if (!prefill && !portalTarget) return;

        if (prefill) {
            navigate('/patient/doctors', { replace: true, state: { aiPrefill: prefill } });
            return undefined;
        }

        const timers = [];
        const queueAction = (callback) => {
            const timerId = window.setTimeout(callback, 40);
            timers.push(timerId);
        };

        if (portalTarget === PATIENT_PORTAL_ROUTE_TARGETS.APPOINTMENTS) {
            setView('appointments');
        } else {
            setView('dashboard');
            if (portalTarget === PATIENT_PORTAL_ROUTE_TARGETS.DOCTORS) {
                queueAction(() => {
                    if (typeof doctorsRef.current?.scrollIntoView === 'function') {
                        doctorsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                });
            } else {
                queueAction(() => {
                    try {
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    } catch {
                        // Ignore environments without scroll support.
                    }
                });
            }
        }

        navigate(location.pathname, { replace: true });

        return () => {
            timers.forEach((timerId) => window.clearTimeout(timerId));
        };
    }, [location.pathname, location.state, navigate]);

    const doctorById = React.useMemo(() => {
        const map = new Map();
        for (const doctor of doctors) map.set(normalizeId(doctor.id), doctor);
        return map;
    }, [doctors]);

    const clinicDoctorCount = React.useMemo(() => {
        const countMap = new Map();
        for (const doctor of doctors) {
            const seen = new Set();
            for (const mapping of doctor.doctor_clinic_specialties || []) {
                const clinicId = normalizeId(mapping.clinicId || mapping.clinic?.id);
                if (!clinicId || seen.has(clinicId)) continue;
                seen.add(clinicId);
                countMap.set(clinicId, (countMap.get(clinicId) || 0) + 1);
            }
        }
        return countMap;
    }, [doctors]);

    const specialtyDoctorCount = React.useMemo(() => {
        const countMap = new Map();
        for (const doctor of doctors) {
            const seen = new Set();
            for (const mapping of doctor.doctor_clinic_specialties || []) {
                const specialtyId = normalizeId(mapping.specialtyId || mapping.specialty?.id);
                if (!specialtyId || seen.has(specialtyId)) continue;
                seen.add(specialtyId);
                countMap.set(specialtyId, (countMap.get(specialtyId) || 0) + 1);
            }
        }
        return countMap;
    }, [doctors]);

    const orderedSpecialties = React.useMemo(
        () =>
            [...specialties].sort((a, b) => {
                const countA = specialtyDoctorCount.get(normalizeId(a.id)) || 0;
                const countB = specialtyDoctorCount.get(normalizeId(b.id)) || 0;
                if (countA !== countB) return countB - countA;
                return String(a.name || '').localeCompare(String(b.name || ''));
            }),
        [specialties, specialtyDoctorCount]
    );

    const sortedBookingsAscending = React.useMemo(
        () => [...bookings].sort((a, b) => bookingSortValue(a) - bookingSortValue(b)),
        [bookings]
    );
    const sortedBookingsDescending = React.useMemo(
        () => [...bookings].sort((a, b) => bookingSortValue(b) - bookingSortValue(a)),
        [bookings]
    );

    const upcomingBooking = sortedBookingsAscending.find((booking) => booking.statusId === 'S1');
    const upcomingDoctor = upcomingBooking ? doctorById.get(normalizeId(upcomingBooking.doctorId)) : null;
    const orderedClinics = React.useMemo(
        () =>
            [...clinics].sort(
                (a, b) => (clinicDoctorCount.get(normalizeId(b.id)) || 0) - (clinicDoctorCount.get(normalizeId(a.id)) || 0)
            ),
        [clinics, clinicDoctorCount]
    );
    const availableDoctors = React.useMemo(() => doctors, [doctors]);
    const topClinics = orderedClinics.slice(0, 3);
    const clinicCarouselItems = orderedClinics;
    const moveToDoctors = () => {
        setView('dashboard');
        setTimeout(() => {
            if (typeof doctorsRef.current?.scrollIntoView === 'function') {
                doctorsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 40);
    };

    const openDoctorDirectory = () => {
        navigate('/patient/doctors');
    };

    const handleLogout = async () => {
        dispatch(resetAiSession());
        await dispatch(logoutUser());
        navigate('/login');
    };

    const handleCancelBooking = async (id) => {
        setActionLoadingId(id);
        const result = await dispatch(cancelBooking(id));
        setActionLoadingId(null);
        if (cancelBooking.fulfilled.match(result)) dispatch(fetchBookings());
    };

    const renderDoctorCard = (doctor, keyPrefix = 'doctor') => {
        const mapping = doctor.doctor_clinic_specialties?.[0];
        const clinicName = mapping?.clinic?.name || doctor.doctor_infor?.nameClinic || 'Clinic updating';
        const specialtyName = mapping?.specialty?.name || 'Specialty updating';
        const nextAvailable = resolveNextAvailableLabel(doctor);
        const doctorImage = resolveImageSource(doctor.image, apiAssetBase);

        return (
            <article key={`${keyPrefix}-${doctor.id}`} className="min-h-[270px] rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start gap-3">
                    <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                        {doctorImage ? (
                            <img src={doctorImage} alt={doctor.name} className="h-full w-full object-cover object-top" />
                        ) : (
                            <div className="grid h-full w-full place-items-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-500">
                                <span className="material-symbols-outlined text-4xl">person</span>
                            </div>
                        )}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="truncate font-black text-slate-900">{doctor.name}</p>
                        <p className="mt-0.5 text-sm font-semibold text-primary">{specialtyName}</p>
                        <p className="mt-3 flex items-center gap-2 text-sm text-slate-500">
                            <span className="material-symbols-outlined text-[18px] text-slate-400">location_on</span>
                            <span className="truncate">{clinicName}</span>
                        </p>
                        <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                            <span className="material-symbols-outlined text-[18px] text-slate-400">schedule</span>
                            <span>Next available: {nextAvailable}</span>
                        </p>
                    </div>
                </div>
                <Link
                    to={`/patient/doctor/${doctor.id}`}
                    className="mt-4 block w-full rounded-xl border border-primary px-3 py-2 text-center text-sm font-black text-primary hover:bg-blue-50"
                >
                    Book Appointment
                </Link>
            </article>
        );
    };

    const renderSpecialtyCard = (specialty, keyPrefix = 'specialty') => {
        const specialtyImage = resolveImageSource(specialty.image, apiAssetBase);
        const doctorCount = specialtyDoctorCount.get(normalizeId(specialty.id)) || 0;
        const visual = resolveSpecialtyVisual(specialty);

        return (
            <button
                key={`${keyPrefix}-${specialty.id}`}
                type="button"
                onClick={() => navigate(`/patient/specialties/${specialty.id}`)}
                className="min-h-[320px] w-full rounded-3xl border border-slate-200 bg-white p-4 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-[#7fd2df]"
            >
                <div className="rounded-2xl border border-slate-100 bg-[#f3f7f8] p-3">
                    {specialtyImage ? (
                        <img src={specialtyImage} alt={specialty.name} className="h-40 w-full object-contain" />
                    ) : (
                        <div className={`grid h-40 w-full place-items-center rounded-xl ${visual.bubbleTone}`}>
                            <span className={`material-symbols-outlined text-7xl ${visual.iconTone}`}>{visual.icon}</span>
                        </div>
                    )}
                </div>
                <p className="mt-4 min-h-12 text-lg font-black leading-6 text-slate-900">{specialty.name}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">{doctorCount} doctor(s)</p>
                <p className="mt-3 text-xs font-black uppercase tracking-[0.14em] text-primary">View Specialty</p>
            </button>
        );
    };

    const renderClinicCard = (clinic, keyPrefix = 'clinic') => {
        const imageSrc = resolveImageSource(clinic.image, apiAssetBase);

        return (
            <article key={`${keyPrefix}-${clinic.id}`} className="h-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                {imageSrc ? <img src={imageSrc} alt={clinic.name} className="h-44 w-full object-cover" /> : <div className="h-44 w-full bg-gradient-to-br from-slate-100 to-slate-200" />}
                <div className="p-4">
                    <p className="font-black">{clinic.name}</p>
                    <p className="text-sm text-slate-500">{clinic.address || 'Address updating'}</p>
                    <p className="mt-1 text-xs text-slate-500">{clinicDoctorCount.get(normalizeId(clinic.id)) || 0} doctor(s)</p>
                    <button
                        type="button"
                        onClick={() => navigate(`/patient/clinics/${clinic.id}`)}
                        className="mt-3 w-full rounded-xl border border-primary px-3 py-2 text-sm font-black text-primary hover:bg-blue-50"
                    >
                        View Clinic
                    </button>
                </div>
            </article>
        );
    };

    const featuredClinic = topClinics[0] || orderedClinics[0];
    const featuredClinicImage = resolveImageSource(featuredClinic?.image, apiAssetBase);

    return (
        <div className="min-h-screen bg-slate-100 text-slate-900">
            <PatientPortalHeader
                user={user}
                onHome={() => navigate('/patient', { state: { portalTarget: PATIENT_PORTAL_ROUTE_TARGETS.DASHBOARD } })}
                onFindDoctors={() => openDoctorDirectory()}
                onClinics={() => navigate('/patient/clinics')}
                onAiSupport={() => navigate('/patient/ai')}
                onAppointments={() => setView('appointments')}
                onLogout={handleLogout}
            />

            <main className={`w-full pb-0 ${view === 'dashboard' ? 'pt-0' : 'pt-6 sm:pt-8'}`}>
                {view === 'dashboard' ? (
                    <div className="space-y-0">
                        <section className="w-full bg-white">
                            <div className="mx-auto w-full max-w-[1240px] px-4 pb-8 pt-6 sm:px-8 sm:pb-10 sm:pt-8">
                                <section className="px-2 sm:px-4">
                            <div className="grid gap-6 lg:grid-cols-2">
                                <div className="space-y-4">
                                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Healthcare Reimagined</p>
                                    <h1 className="text-3xl font-black sm:text-5xl">Your Health,<br /><span className="text-primary">Simplified.</span></h1>
                                    <p className="text-slate-600">Hi {user?.name || 'Patient'}, connect with our top UK specialists in minutes. Book appointments, manage health records, and get professional care at your fingertips.</p>
                                    <div className="pt-2">
                                        <PatientAiEntryCard />
                                    </div>
                                </div>
                                <div className="relative">
                                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                                        {featuredClinicImage ? <img src={featuredClinicImage} alt={featuredClinic?.name || 'Clinic'} className="h-[260px] w-full object-cover sm:h-[300px] lg:h-[340px]" /> : <div className="h-[260px] w-full bg-gradient-to-br from-slate-100 via-slate-200 to-slate-300 sm:h-[300px] lg:h-[340px]" />}
                                    </div>
                                    <div className="absolute -bottom-4 left-4 right-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-md">
                                        <div className="flex items-center gap-3">
                                            {upcomingBooking && (
                                                <div className="relative grid h-14 w-14 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-600">
                                                    <span className="absolute h-14 w-14 rounded-full bg-emerald-300/40 animate-ping" />
                                                    <BsCheckCircleFill className="relative text-[22px] animate-[pulse_1.8s_ease-in-out_infinite]" />
                                                </div>
                                            )}
                                            <div className="min-w-0">
                                                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Next Available</p>
                                                {upcomingBooking ? (
                                                    <>
                                                        <p className="mt-1 truncate text-sm font-bold text-slate-900">
                                                            {formatBookingDate(upcomingBooking.date)} - {timeLabels[upcomingBooking.timeType] || upcomingBooking.timeType}
                                                        </p>
                                                        <p className="mt-0.5 truncate text-xs text-slate-500">{upcomingDoctor?.name || `Doctor #${upcomingBooking.doctorId}`}</p>
                                                    </>
                                                ) : (
                                                    <p className="mt-1 text-sm font-semibold text-slate-700">No upcoming appointment.</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                                <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                            <PatientDirectorySearchBar
                                mode="launcher"
                                onLauncherClick={() => navigate('/patient/discover')}
                                placeholder="Search specialty, doctor, or clinic..."
                                actionLabel="Explore Directory"
                                launcherAriaLabel="Open patient discover directory"
                            />
                                </section>
                            </div>
                        </section>

                        <section className="w-full bg-slate-100">
                            <div className="mx-auto w-full max-w-[1240px] px-4 py-8 sm:px-8 sm:py-10">
                                <section className="space-y-4">
                            <div className="flex items-center justify-between gap-3">
                                <h2 className="text-2xl font-black">Browse by Specialty</h2>
                                <button
                                    type="button"
                                    onClick={() => setShowAllSpecialties((prev) => !prev)}
                                    className="rounded-2xl bg-[#d9f2f7] px-5 py-2 text-sm font-bold text-[#2d95a8] hover:bg-[#c9eaf2]"
                                >
                                    {showAllSpecialties ? 'See less' : 'See more'}
                                </button>
                            </div>

                            {specialtyError && (
                                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{specialtyError}</div>
                            )}

                            {loadingSpecialties ? (
                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">Loading specialties...</div>
                            ) : orderedSpecialties.length === 0 ? (
                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">No specialties available.</div>
                            ) : showAllSpecialties ? (
                                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                                    {orderedSpecialties.map((specialty) => renderSpecialtyCard(specialty, 'all-specialty'))}
                                </div>
                            ) : (
                                <div className="relative px-10 py-2">
                                    <button
                                        type="button"
                                        className="specialty-swiper-prev absolute left-0 top-1/2 z-10 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-xl border border-[#a7dde6] bg-white text-[#2d95a8] shadow-sm hover:bg-[#eefbfe]"
                                    >
                                        <span className="material-symbols-outlined">chevron_left</span>
                                    </button>
                                    <button
                                        type="button"
                                        className="specialty-swiper-next absolute right-0 top-1/2 z-10 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-xl border border-[#a7dde6] bg-white text-[#2d95a8] shadow-sm hover:bg-[#eefbfe]"
                                    >
                                        <span className="material-symbols-outlined">chevron_right</span>
                                    </button>

                                    <Swiper
                                        modules={[Navigation]}
                                        navigation={{
                                            prevEl: '.specialty-swiper-prev',
                                            nextEl: '.specialty-swiper-next',
                                        }}
                                        spaceBetween={18}
                                        breakpoints={{
                                            0: { slidesPerView: 1 },
                                            768: { slidesPerView: 2 },
                                            1200: { slidesPerView: 3 },
                                        }}
                                    >
                                        {orderedSpecialties.map((specialty) => (
                                            <SwiperSlide key={specialty.id}>
                                                {renderSpecialtyCard(specialty)}
                                            </SwiperSlide>
                                        ))}
                                    </Swiper>
                                </div>
                            )}
                                </section>
                            </div>
                        </section>

                        <section className="w-full bg-white">
                            <div className="mx-auto w-full max-w-[1240px] px-4 py-8 sm:px-8 sm:py-10">
                                <section className="space-y-4">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <h2 className="text-2xl font-black">Top Clinics</h2>
                                    <p className="text-xs font-semibold text-slate-500">{orderedClinics.length} clinic(s)</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => navigate('/patient/clinics')}
                                    className="rounded-2xl bg-[#d9f2f7] px-5 py-2 text-sm font-bold text-[#2d95a8] hover:bg-[#c9eaf2]"
                                >
                                    View all clinics
                                </button>
                            </div>
                            {clinicError && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{clinicError}</div>}
                            {loadingClinics ? (
                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">Loading clinics...</div>
                            ) : orderedClinics.length === 0 ? (
                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">No clinics available.</div>
                            ) : (
                                <div className="relative px-10 py-2">
                                    <button
                                        type="button"
                                        className="clinic-swiper-prev absolute left-0 top-1/2 z-10 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-xl border border-[#a7dde6] bg-white text-[#2d95a8] shadow-sm hover:bg-[#eefbfe]"
                                    >
                                        <span className="material-symbols-outlined">chevron_left</span>
                                    </button>
                                    <button
                                        type="button"
                                        className="clinic-swiper-next absolute right-0 top-1/2 z-10 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-xl border border-[#a7dde6] bg-white text-[#2d95a8] shadow-sm hover:bg-[#eefbfe]"
                                    >
                                        <span className="material-symbols-outlined">chevron_right</span>
                                    </button>

                                    <Swiper
                                        modules={[Navigation]}
                                        navigation={{
                                            prevEl: '.clinic-swiper-prev',
                                            nextEl: '.clinic-swiper-next',
                                        }}
                                        spaceBetween={16}
                                        breakpoints={{
                                            0: { slidesPerView: 1 },
                                            640: { slidesPerView: 2 },
                                            1024: { slidesPerView: 3 },
                                        }}
                                    >
                                        {clinicCarouselItems.map((clinic) => (
                                            <SwiperSlide key={clinic.id}>
                                                {renderClinicCard(clinic)}
                                            </SwiperSlide>
                                        ))}
                                    </Swiper>
                                </div>
                            )}
                                </section>
                            </div>
                        </section>

                        <section className="w-full bg-slate-100">
                            <div className="mx-auto w-full max-w-[1240px] px-4 py-8 sm:px-8 sm:py-10">
                                <section ref={doctorsRef} className="space-y-4">
                            <div className="flex items-end justify-between gap-3">
                                <h2 className="text-2xl font-black">Available Doctors</h2>
                                <div className="flex items-center gap-3">
                                    <p className="text-xs font-semibold text-slate-500">{availableDoctors.length} doctor(s)</p>
                                    <button
                                        type="button"
                                        onClick={openDoctorDirectory}
                                        className="rounded-2xl bg-cyan-100 px-4 py-2 text-sm font-bold text-cyan-700 hover:bg-cyan-200"
                                    >
                                        See more
                                    </button>
                                </div>
                            </div>
                            {doctorError && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{doctorError}</div>}
                            {loadingDoctors ? (
                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">Loading doctors...</div>
                            ) : availableDoctors.length === 0 ? (
                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">No doctors available.</div>
                            ) : (
                                <div className="relative px-10 py-2">
                                    <button
                                        type="button"
                                        className="doctor-swiper-prev absolute left-0 top-1/2 z-10 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-xl border border-[#a7dde6] bg-white text-[#2d95a8] shadow-sm hover:bg-[#eefbfe]"
                                    >
                                        <span className="material-symbols-outlined">chevron_left</span>
                                    </button>
                                    <button
                                        type="button"
                                        className="doctor-swiper-next absolute right-0 top-1/2 z-10 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-xl border border-[#a7dde6] bg-white text-[#2d95a8] shadow-sm hover:bg-[#eefbfe]"
                                    >
                                        <span className="material-symbols-outlined">chevron_right</span>
                                    </button>

                                    <Swiper
                                        modules={[Navigation]}
                                        navigation={{
                                            prevEl: '.doctor-swiper-prev',
                                            nextEl: '.doctor-swiper-next',
                                        }}
                                        spaceBetween={16}
                                        breakpoints={{
                                            0: { slidesPerView: 1 },
                                            768: { slidesPerView: 2 },
                                            1200: { slidesPerView: 3 },
                                        }}
                                    >
                                        {availableDoctors.map((doctor) => (
                                            <SwiperSlide key={doctor.id}>
                                                {renderDoctorCard(doctor)}
                                            </SwiperSlide>
                                        ))}
                                    </Swiper>
                                </div>
                            )}
                                </section>
                            </div>
                        </section>

                        <section className="relative left-1/2 w-screen -translate-x-1/2 overflow-hidden bg-white">
                            <div className="mx-auto w-full max-w-[1240px] px-4 py-14 sm:px-8 sm:py-16">
                                <div className="text-center">
                                    <h2 className="text-3xl font-black text-slate-900">How it Works</h2>
                                    <p className="mt-2 text-sm text-slate-500">Booking professional medical care is now easier than ever.</p>
                                </div>
                                <div className="mx-auto mt-10 grid max-w-[980px] gap-8 md:grid-cols-3">
                                    {HOW_IT_WORKS_STEPS.map((item) => (
                                        <article key={item.title} className="flex min-h-[220px] flex-col items-center p-2 text-center">
                                            <div className="mx-auto grid h-14 w-14 place-items-center rounded-xl bg-blue-50 text-primary">
                                                <span className="material-symbols-outlined">{item.icon}</span>
                                            </div>
                                            <h3 className="mt-4 text-lg font-black text-slate-900">{item.title}</h3>
                                            <p className="mt-2 text-sm text-slate-500">{item.description}</p>
                                        </article>
                                    ))}
                                </div>
                            </div>

                            <PatientPortalFooter />
                        </section>
                    </div>
                ) : (
                    <div className="space-y-0">
                        <section className="w-full bg-slate-100">
                            <div className="mx-auto w-full max-w-[1240px] px-4 py-8 sm:px-8 sm:py-10">
                                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                                    <div>
                                        <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">My Appointments</h1>
                                        <p className="mt-3 max-w-2xl text-sm font-medium text-slate-500 sm:text-base">
                                            Manage your clinical visits and digital consultations.
                                        </p>
                                    </div>

                                    <button
                                        onClick={() => setView('dashboard')}
                                        className="inline-flex items-center gap-2 self-start rounded-2xl bg-primary px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/20 transition-transform duration-150 active:scale-95 lg:self-auto"
                                    >
                                        <span className="material-symbols-outlined text-[20px]">dashboard</span>
                                        Back to Dashboard
                                    </button>
                                </div>
                            </div>
                        </section>

                        <section className="w-full bg-slate-100">
                            <div className="mx-auto w-full max-w-[1240px] px-4 pb-10 sm:px-8 sm:pb-12">
                                {bookingError && (
                                    <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                        {bookingError}
                                    </div>
                                )}

                                {loadingBookings ? (
                                    <div className="rounded-[28px] border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
                                        Loading appointments...
                                    </div>
                                ) : sortedBookingsDescending.length === 0 ? (
                                    <div className="rounded-[28px] border border-slate-200 bg-white p-10 text-center shadow-sm">
                                        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-slate-100 text-slate-400">
                                            <span className="material-symbols-outlined text-[30px]">calendar_month</span>
                                        </div>
                                        <h2 className="mt-5 text-2xl font-black text-slate-900">No appointments yet</h2>
                                        <p className="mt-2 text-sm text-slate-500">
                                            Book your first visit from the dashboard to see upcoming and past appointments here.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="grid gap-5" data-testid="patient-appointments-list">
                                        {sortedBookingsDescending.map((booking) => {
                                            const doctor = doctorById.get(normalizeId(booking.doctorId));
                                            const status = getBookingStatusMeta(booking, statusLabels);
                                            const paymentSummary = getPaymentSummary(booking);
                                            const canCancel = canPatientCancelBooking(booking);
                                            const visual = getPatientAppointmentVisual(booking, paymentSummary);
                                            const { specialtyName, clinicName, doctorEmail } = resolveDoctorAppointmentMeta(doctor);

                                            return (
                                                <article
                                                    key={booking.id}
                                                    data-testid={`patient-booking-${booking.id}`}
                                                    className={`rounded-[30px] border border-slate-200 bg-white px-6 py-7 shadow-[0_14px_34px_rgba(15,23,42,0.05)] transition-colors duration-300 hover:bg-slate-50 sm:px-8 ${visual.articleClass}`}
                                                >
                                                    <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
                                                        <div className="flex flex-col gap-6 md:flex-row md:gap-8 xl:flex-1">
                                                            <div className="shrink-0">
                                                                <div className={`grid h-[72px] w-[72px] place-items-center rounded-full ${visual.bubbleClass}`}>
                                                                    <span className="material-symbols-outlined text-[30px]">{visual.icon}</span>
                                                                </div>
                                                            </div>

                                                            <div className="grid flex-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                                                                <div>
                                                                    <h2 className="text-[28px] font-black leading-none tracking-tight text-slate-900 sm:text-[32px] md:text-[30px] xl:text-[32px]">
                                                                        {doctor?.name || `Doctor #${booking.doctorId}`}
                                                                    </h2>
                                                                    <p className="mt-2 text-base font-medium text-slate-500">{specialtyName}</p>
                                                                    <p className="mt-4 flex items-start gap-2 text-sm text-slate-500">
                                                                        <span className="material-symbols-outlined mt-0.5 text-[18px] text-slate-400">location_on</span>
                                                                        <span>{clinicName}</span>
                                                                    </p>
                                                                </div>

                                                                <div>
                                                                    <div className="flex items-center gap-2 text-base font-black text-slate-900">
                                                                        <span className="material-symbols-outlined text-[18px] text-primary">event</span>
                                                                        <span>{formatBookingDate(booking.date)}</span>
                                                                    </div>
                                                                    <div className="mt-3 flex items-center gap-2 text-base text-slate-500">
                                                                        <span className="material-symbols-outlined text-[18px] text-slate-400">schedule</span>
                                                                        <span>{timeLabels[booking.timeType] || booking.timeType}</span>
                                                                    </div>
                                                                </div>

                                                                <div>
                                                                    <p className="text-base font-semibold text-slate-600">{doctorEmail}</p>
                                                                    <p className="mt-3 text-base font-black text-primary">{paymentSummary.label}</p>
                                                                    <p className="mt-4 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                                                                        Booking #{booking.id}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="flex flex-col items-start gap-3 xl:min-w-[170px] xl:items-end">
                                                            <span className={`inline-flex rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.16em] ${status.className}`}>
                                                                {status.label}
                                                            </span>
                                                            {canCancel && (
                                                                <button
                                                                    onClick={() => handleCancelBooking(booking.id)}
                                                                    disabled={actionLoadingId === booking.id}
                                                                    className="rounded-full bg-red-100 px-4 py-2 text-sm font-bold text-red-700 transition-colors hover:bg-red-200 disabled:cursor-not-allowed disabled:opacity-60"
                                                                >
                                                                    {actionLoadingId === booking.id ? 'Cancelling...' : 'Cancel Appointment'}
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </article>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </section>

                        <section className="relative left-1/2 w-screen -translate-x-1/2 overflow-hidden bg-white">
                            <PatientPortalFooter />
                        </section>
                    </div>
                )}
            </main>
        </div>
    );
};

export default PatientDashboard;
