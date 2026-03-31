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
import { DEFAULT_TIME_LABELS } from '../utils/timeSlots';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import { BsCheckCircleFill } from 'react-icons/bs';
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
    const slotValue = (Number.parseInt(String(booking.timeType).replace(/\D/g, ''), 10) || 99) * 3600000;
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

    if (isOnlinePaymentPending(booking)) {
        return {
            label: 'Awaiting payment',
            className: 'bg-amber-50 text-amber-700 border-amber-200',
        };
    }

    return {
        label: statusLabels.S1 || 'New',
        className: STATUS_BADGE_CLASSES.S1,
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

const buildAiDashboardFilters = (prefill) => ({
    search: prefill?.specialtyName || '',
    location: prefill?.locationQuery || '',
    specialtyId: prefill?.specialtyId ? String(prefill.specialtyId) : '',
    clinicId: '',
});

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
        title: '1. Search & Filter',
        description: 'Search by specialty, location, or clinic name. Use filters to quickly find the right doctor.',
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

const FOOTER_COLUMNS = [
    {
        title: 'For Patients',
        links: ['Find a Specialist', 'Symptom Checker', 'Health Records', 'Patient Stories'],
    },
    {
        title: 'For Clinics',
        links: ['Join as a Clinic', 'Practice Software', 'Appointments API', 'Resources'],
    },
    {
        title: 'Support',
        links: ['Help Center', 'Privacy Policy', 'Contact Us', 'Accessibility'],
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
    const howItWorksRef = React.useRef(null);

    const { user } = useSelector((state) => state.auth);
    const { specialties, loading: loadingSpecialties, error: specialtyError } = useSelector((state) => state.specialty);
    const { clinics, loading: loadingClinics, error: clinicError } = useSelector((state) => state.clinic);
    const { doctors, loading: loadingDoctors, error: doctorError } = useSelector((state) => state.doctor);
    const { bookings, loading: loadingBookings, error: bookingError } = useSelector((state) => state.booking);

    const [view, setView] = React.useState('dashboard');
    const [menuOpen, setMenuOpen] = React.useState(false);
    const [actionLoadingId, setActionLoadingId] = React.useState(null);
    const [filters, setFilters] = React.useState({ search: '', location: '', specialtyId: '', clinicId: '' });
    const [appliedFilters, setAppliedFilters] = React.useState({ search: '', location: '', specialtyId: '', clinicId: '' });
    const [statusLabels, setStatusLabels] = React.useState(DEFAULT_STATUS_LABELS);
    const [timeLabels, setTimeLabels] = React.useState(DEFAULT_TIME_LABELS);
    const [showAllSpecialties, setShowAllSpecialties] = React.useState(false);
    const [showAllDoctors, setShowAllDoctors] = React.useState(false);

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
        if (!menuOpen) return undefined;
        const handleClickOutside = (event) => {
            if (!event.target?.closest?.('[data-patient-menu]')) setMenuOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [menuOpen]);

    React.useEffect(() => {
        const prefill = location.state?.aiPrefill;
        if (!prefill) return;

        const nextFilters = buildAiDashboardFilters(prefill);
        setView('dashboard');
        setFilters(nextFilters);
        setAppliedFilters(nextFilters);
        setShowAllDoctors(false);

        const scrollTimer = window.setTimeout(() => {
            if (typeof doctorsRef.current?.scrollIntoView === 'function') {
                doctorsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 40);

        navigate(location.pathname, { replace: true });

        return () => window.clearTimeout(scrollTimer);
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

    const filteredDoctors = React.useMemo(() => {
        const keyword = normalizeSearchText(appliedFilters.search).trim();
        const locationKeyword = normalizeSearchText(appliedFilters.location).trim();
        const specialtyId = normalizeId(appliedFilters.specialtyId);
        const clinicId = normalizeId(appliedFilters.clinicId);
        return doctors.filter((doctor) => {
            const mappings = doctor.doctor_clinic_specialties || [];
            if (specialtyId && !mappings.some((m) => normalizeId(m.specialtyId || m.specialty?.id) === specialtyId)) return false;
            if (clinicId && !mappings.some((m) => normalizeId(m.clinicId || m.clinic?.id) === clinicId)) return false;
            if (keyword) {
                const text = normalizeSearchText(
                    [
                        doctor.name,
                        doctor.email,
                        ...mappings.map((m) => m.clinic?.name),
                        ...mappings.map((m) => m.specialty?.name),
                    ]
                        .filter(Boolean)
                        .join(' ')
                );
                if (!text.includes(keyword)) return false;
            }

            if (locationKeyword) {
                const locationText = normalizeSearchText(
                    [
                        doctor.doctor_infor?.nameClinic,
                        doctor.doctor_infor?.addressClinic,
                        ...mappings.map((m) => m.clinic?.name),
                        ...mappings.map((m) => m.clinic?.address),
                    ]
                        .filter(Boolean)
                        .join(' ')
                );
                if (!locationText.includes(locationKeyword)) return false;
            }

            return true;
        });
    }, [appliedFilters, doctors]);

    const sortedBookings = React.useMemo(
        () => [...bookings].sort((a, b) => bookingSortValue(a) - bookingSortValue(b)),
        [bookings]
    );

    const upcomingBooking = sortedBookings.find((booking) => booking.statusId === 'S1');
    const upcomingDoctor = upcomingBooking ? doctorById.get(normalizeId(upcomingBooking.doctorId)) : null;
    const orderedClinics = React.useMemo(
        () =>
            [...clinics].sort(
                (a, b) => (clinicDoctorCount.get(normalizeId(b.id)) || 0) - (clinicDoctorCount.get(normalizeId(a.id)) || 0)
            ),
        [clinics, clinicDoctorCount]
    );
    const topClinics = orderedClinics.slice(0, 3);
    const clinicCarouselItems = orderedClinics;
    const currentYear = new Date().getFullYear();
    const updatedDate = new Date().toLocaleDateString('en-GB');

    const moveToDoctors = () => {
        setView('dashboard');
        setTimeout(() => {
            if (typeof doctorsRef.current?.scrollIntoView === 'function') {
                doctorsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 40);
    };

    const moveToHowItWorks = () => {
        setView('dashboard');
        setTimeout(() => {
            if (typeof howItWorksRef.current?.scrollIntoView === 'function') {
                howItWorksRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 40);
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

    const handleApplyFilters = (event) => {
        event.preventDefault();
        setAppliedFilters(filters);
        setShowAllDoctors(false);
        moveToDoctors();
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
            <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
                <div className="mx-auto flex w-full max-w-[1240px] items-center justify-between gap-3 px-4 py-3 sm:px-8">
                    <div className="flex items-center gap-3">
                        <div className="grid size-9 place-items-center rounded-lg bg-primary text-white">
                            <span className="material-symbols-outlined text-[20px]">health_and_safety</span>
                        </div>
                        <div>
                            <p className="font-black">HealthSync</p>
                            <p className="text-xs text-slate-500">Patient Portal</p>
                        </div>
                    </div>
                    <nav className="hidden items-center gap-2 md:flex">
                        <button onClick={moveToDoctors} className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">Find Doctors</button>
                        <button onClick={() => navigate('/patient/clinics')} className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">Clinics</button>
                        <button
                            onClick={() => navigate('/patient/ai')}
                            className="group inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-primary transition hover:bg-blue-50"
                        >
                            <span className="material-symbols-outlined text-[18px] text-amber-500 transition-transform duration-200 group-hover:scale-110 group-hover:rotate-12">auto_awesome</span>
                            <span>AI Support</span>
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-amber-700 transition-transform duration-200 group-hover:scale-105">
                                New
                            </span>
                        </button>
                        <button onClick={moveToHowItWorks} className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">How It Works</button>
                        <button onClick={() => setView('appointments')} className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">My Appointments</button>
                    </nav>
                    <div className="relative" data-patient-menu>
                        <button onClick={() => setMenuOpen((prev) => !prev)} className="flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-sm">
                            <span className="max-w-28 truncate font-semibold">{user?.name}</span>
                            <span className="material-symbols-outlined text-[18px] text-slate-500">expand_more</span>
                        </button>
                        {menuOpen && (
                            <div className="absolute right-0 mt-2 w-52 rounded-xl border border-slate-200 bg-white p-2 shadow-md">
                                <button onClick={() => { navigate('/patient/clinics'); setMenuOpen(false); }} className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100">Clinics</button>
                                <button
                                    onClick={() => { navigate('/patient/ai'); setMenuOpen(false); }}
                                    className="group flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-primary transition hover:bg-blue-50"
                                >
                                    <span className="inline-flex items-center gap-2 font-semibold">
                                        <span className="material-symbols-outlined text-[18px] text-amber-500 transition-transform duration-200 group-hover:scale-110 group-hover:rotate-12">auto_awesome</span>
                                        AI Support
                                    </span>
                                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-amber-700 transition-transform duration-200 group-hover:scale-105">
                                        New
                                    </span>
                                </button>
                                <button onClick={() => { setView('appointments'); setMenuOpen(false); }} className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100">My Appointments</button>
                                <button onClick={handleLogout} className="mt-1 w-full rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50">Logout</button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

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
                            <form onSubmit={handleApplyFilters} className="grid gap-3 lg:grid-cols-[1.25fr_1fr_auto]">
                                <div className="relative">
                                    <span className="material-symbols-outlined pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[18px] text-slate-400">search</span>
                                    <input
                                        name="search"
                                        value={filters.search}
                                        onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
                                        placeholder="Specialty (e.g. Cardiology, GP)"
                                        className="h-14 w-full rounded-xl border border-transparent bg-slate-100 pl-11 pr-4 text-sm text-slate-700 outline-none transition focus:border-primary focus:bg-white"
                                    />
                                </div>
                                <div className="relative">
                                    <span className="material-symbols-outlined pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[18px] text-slate-400">location_on</span>
                                    <input
                                        name="location"
                                        value={filters.location}
                                        onChange={(event) => setFilters((prev) => ({ ...prev, location: event.target.value }))}
                                        placeholder="City or Postcode"
                                        className="h-14 w-full rounded-xl border border-transparent bg-slate-100 pl-11 pr-4 text-sm text-slate-700 outline-none transition focus:border-primary focus:bg-white"
                                    />
                                </div>
                                <button type="submit" className="h-14 rounded-xl bg-primary px-8 text-sm font-black text-white shadow-sm transition hover:bg-blue-700">Find Appointments</button>
                            </form>
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
                                    <p className="text-xs font-semibold text-slate-500">{filteredDoctors.length} result(s)</p>
                                    <button
                                        type="button"
                                        onClick={() => setShowAllDoctors((prev) => !prev)}
                                        className="rounded-2xl bg-cyan-100 px-4 py-2 text-sm font-bold text-cyan-700 hover:bg-cyan-200"
                                    >
                                        {showAllDoctors ? 'See less' : 'See more'}
                                    </button>
                                </div>
                            </div>
                            {doctorError && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{doctorError}</div>}
                            {loadingDoctors ? (
                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">Loading doctors...</div>
                            ) : filteredDoctors.length === 0 ? (
                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">No doctors match your filters.</div>
                            ) : showAllDoctors ? (
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                                    {filteredDoctors.map((doctor) => renderDoctorCard(doctor, 'all-doctor'))}
                                </div>
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
                                        {filteredDoctors.map((doctor) => (
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

                        <section ref={howItWorksRef} className="relative left-1/2 w-screen -translate-x-1/2 overflow-hidden bg-white">
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

                            <footer className="mx-auto w-full max-w-[1240px] bg-white px-4 py-10 sm:px-8 sm:py-12">
                                <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr]">
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <div className="grid size-9 place-items-center rounded-lg bg-primary text-white">
                                                <span className="material-symbols-outlined text-[20px]">health_and_safety</span>
                                            </div>
                                            <div>
                                                <p className="font-black">HealthSync</p>
                                                <p className="text-xs text-slate-500">Patient Portal</p>
                                            </div>
                                        </div>
                                        <p className="mt-4 max-w-xs text-sm text-slate-500">
                                            A healthcare booking platform to help patients discover clinics, connect with doctors, and manage appointments.
                                        </p>
                                    </div>

                                    {FOOTER_COLUMNS.map((column) => (
                                        <div key={column.title}>
                                            <h3 className="text-sm font-black text-slate-900">{column.title}</h3>
                                            <div className="mt-3 space-y-2">
                                                {column.links.map((link) => (
                                                    <a key={link} href="#" className="block text-sm text-slate-500 hover:text-primary">
                                                        {link}
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-8 flex flex-col gap-2 border-t border-slate-200 pt-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                                    <p>&copy; {currentYear} HealthSync Platform. All rights reserved.</p>
                                    <p>Last updated: {updatedDate}</p>
                                </div>
                            </footer>
                        </section>
                    </div>
                ) : (
                    <section className="space-y-4">
                        <div className="flex items-center justify-between gap-2">
                            <h1 className="text-2xl font-black sm:text-3xl">My Appointments</h1>
                            <button onClick={() => setView('dashboard')} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400">Back to Dashboard</button>
                        </div>
                        {bookingError && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{bookingError}</div>}
                        {loadingBookings ? <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">Loading appointments...</div> : (
                            <div className="space-y-3">
                                {sortedBookings.map((booking) => {
                                    const doctor = doctorById.get(normalizeId(booking.doctorId));
                                    const status = getBookingStatusMeta(booking, statusLabels);
                                    const paymentSummary = getPaymentSummary(booking);
                                    const canCancel = canPatientCancelBooking(booking);
                                    return (
                                        <article key={booking.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                                            <div className="flex items-center justify-between gap-2">
                                                <div>
                                                    <p className="font-black">Booking #{booking.id}</p>
                                                    <p className="text-sm text-slate-500">{doctor?.name || `Doctor #${booking.doctorId}`}</p>
                                                </div>
                                                <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${status.className}`}>{status.label}</span>
                                            </div>
                                            <p className="mt-2 text-sm text-slate-600">Date: {formatBookingDate(booking.date)}</p>
                                            <p className="text-sm text-slate-600">Time: {timeLabels[booking.timeType] || booking.timeType}</p>
                                            <p className="text-sm text-slate-600">Contact email: {booking.patientContactEmail || user?.email || 'Not provided'}</p>
                                            <p className="text-sm text-slate-600">Payment: {paymentSummary.label}</p>
                                            {booking.confirmedAt && booking.statusId === 'S1' && (
                                                <p className="mt-3 text-sm font-medium text-blue-700">
                                                    Your doctor has confirmed this appointment.
                                                </p>
                                            )}
                                            {!booking.confirmedAt && paymentSummary.tone === 'pending' && (
                                                <p className="mt-3 text-sm font-medium text-amber-700">
                                                    Online payment is still pending. The clinic cannot confirm this booking until payment completes.
                                                </p>
                                            )}
                                            {!booking.confirmedAt && paymentSummary.tone === 'paid' && (
                                                <p className="mt-3 text-sm font-medium text-emerald-700">
                                                    Your payment was received successfully. The clinic can now confirm the appointment.
                                                </p>
                                            )}
                                            {canCancel && (
                                                <button
                                                    onClick={() => handleCancelBooking(booking.id)}
                                                    disabled={actionLoadingId === booking.id}
                                                    className="mt-3 rounded-xl bg-red-100 px-4 py-2 text-sm font-bold text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                                                >
                                                    {actionLoadingId === booking.id ? 'Cancelling...' : 'Cancel Appointment'}
                                                </button>
                                            )}
                                        </article>
                                    );
                                })}
                                {sortedBookings.length === 0 && <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">No appointments yet.</div>}
                            </div>
                        )}
                    </section>
                )}
            </main>
        </div>
    );
};

export default PatientDashboard;
