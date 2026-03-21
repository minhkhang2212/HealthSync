import React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import apiClient, { getApiAssetBase } from '../utils/apiClient';
import { readAllcodeCache, writeAllcodeCache } from '../utils/allcodeCache';

const POSITION_LABELS = {
    P0: 'Doctor',
    P1: 'Master',
    P2: 'PhD',
    P3: 'Associate Professor',
    P4: 'Professor',
};

const normalizeId = (value) => (value == null ? '' : String(value));

const extractInitials = (name) =>
    String(name || '')
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase() || 'PT';

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

const getDoctorRelations = (doctor) => doctor?.doctor_clinic_specialties || doctor?.doctorClinicSpecialties || [];

const getDoctorInfo = (doctor) => doctor?.doctor_infor || doctor?.doctorInfor || {};

const resolveDoctorMapping = (doctor, clinicId) => {
    const relations = getDoctorRelations(doctor);
    return (
        relations.find((relation) => normalizeId(relation.clinicId || relation.clinic?.id) === normalizeId(clinicId)) ||
        relations[0] ||
        null
    );
};

const parseNumericAmount = (value) => {
    const matched = String(value || '').match(/(\d+)/);
    if (!matched) return null;
    return Number.parseInt(matched[1], 10);
};

const summarizeText = (text, maxLength = 170) => {
    const value = String(text || '').trim();
    if (!value) return '';
    const firstSentence = value.match(/[^.!?]+[.!?]/)?.[0]?.trim() || value;
    if (firstSentence.length <= maxLength) return firstSentence;
    return `${firstSentence.slice(0, maxLength - 1).trimEnd()}...`;
};

const loadAllcodeMap = async (type) => {
    const cached = readAllcodeCache(type);
    const response = cached
        ? { data: cached }
        : await apiClient.get('/allcodes', { params: { type } });

    if (!cached && Array.isArray(response.data)) {
        writeAllcodeCache(type, response.data);
    }

    return Object.fromEntries((response.data || []).map((item) => [item.key, item.valueEn]));
};

const ClinicDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useSelector((state) => state.auth);

    const [clinic, setClinic] = React.useState(null);
    const [doctors, setDoctors] = React.useState([]);
    const [priceLabels, setPriceLabels] = React.useState({});
    const [paymentLabels, setPaymentLabels] = React.useState({});
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState('');

    const doctorsSectionRef = React.useRef(null);
    const apiAssetBase = React.useMemo(() => getApiAssetBase(), []);

    React.useEffect(() => {
        let cancelled = false;

        const loadPage = async () => {
            setLoading(true);
            setError('');

            const [clinicResult, doctorsResult, priceResult, paymentResult] = await Promise.allSettled([
                apiClient.get(`/v1/clinics/${id}`),
                apiClient.get('/v1/doctors', { params: { clinicId: id } }),
                loadAllcodeMap('PRICE'),
                loadAllcodeMap('PAYMENT'),
            ]);

            if (cancelled) return;

            if (clinicResult.status === 'rejected' || doctorsResult.status === 'rejected') {
                const message =
                    clinicResult.status === 'rejected'
                        ? clinicResult.reason?.response?.data?.message
                        : doctorsResult.reason?.response?.data?.message;

                setError(message || 'Unable to load this clinic right now.');
                setClinic(null);
                setDoctors([]);
                setPriceLabels({});
                setPaymentLabels({});
                setLoading(false);
                return;
            }

            setClinic(clinicResult.value.data);
            setDoctors(doctorsResult.value.data?.data ?? doctorsResult.value.data ?? []);
            setPriceLabels(priceResult.status === 'fulfilled' ? priceResult.value : {});
            setPaymentLabels(paymentResult.status === 'fulfilled' ? paymentResult.value : {});
            setLoading(false);
        };

        if (id) {
            loadPage();
        }

        return () => {
            cancelled = true;
        };
    }, [id]);

    const clinicImage = React.useMemo(
        () => resolveImageSource(clinic?.image, apiAssetBase),
        [apiAssetBase, clinic?.image]
    );

    const specialties = React.useMemo(() => {
        const map = new Map();

        for (const doctor of doctors) {
            for (const relation of getDoctorRelations(doctor)) {
                const clinicId = normalizeId(relation.clinicId || relation.clinic?.id);
                if (clinicId !== normalizeId(id)) continue;

                const specialty = relation.specialty;
                const specialtyId = normalizeId(relation.specialtyId || specialty?.id);
                if (specialtyId && specialty) {
                    map.set(specialtyId, specialty);
                }
            }
        }

        return [...map.values()].sort((left, right) => String(left?.name || '').localeCompare(String(right?.name || '')));
    }, [doctors, id]);

    const consultationFees = React.useMemo(() => {
        const values = [
            ...new Set(
                doctors
                    .map((doctor) => priceLabels[getDoctorInfo(doctor).priceId])
                    .filter(Boolean)
            ),
        ];

        const sortedAmounts = values
            .map(parseNumericAmount)
            .filter((value) => Number.isFinite(value))
            .sort((left, right) => left - right);

        let summary = 'See doctor profile';
        if (sortedAmounts.length === 1) {
            summary = `${sortedAmounts[0]} GBP`;
        } else if (sortedAmounts.length > 1) {
            summary = `${sortedAmounts[0]} - ${sortedAmounts[sortedAmounts.length - 1]} GBP`;
        } else if (values.length === 1) {
            summary = values[0];
        }

        return {
            values,
            summary,
        };
    }, [doctors, priceLabels]);

    const paymentOptions = React.useMemo(
        () =>
            [
                ...new Set(
                    doctors
                        .map((doctor) => paymentLabels[getDoctorInfo(doctor).paymentId])
                        .filter(Boolean)
                ),
            ].sort((left, right) => left.localeCompare(right)),
        [doctors, paymentLabels]
    );

    const mapsUrl = clinic?.address
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(clinic.address)}`
        : null;
    const paymentSummary = paymentOptions.length > 0 ? paymentOptions.join(', ') : 'Shown on doctor profiles';
    const specialtySummary =
        specialties.length > 0 ? specialties.map((specialty) => specialty.name).join(', ') : 'Specialty information unavailable';

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-100 px-4 py-10 text-slate-900 sm:px-8">
                <div className="mx-auto max-w-7xl rounded-[28px] border border-slate-200 bg-white p-8 text-center text-slate-500">
                    Loading clinic page...
                </div>
            </div>
        );
    }

    if (error || !clinic) {
        return (
            <div className="min-h-screen bg-slate-100 px-4 py-10 text-slate-900 sm:px-8">
                <div className="mx-auto max-w-6xl space-y-4 rounded-[28px] border border-red-200 bg-white p-8 text-center">
                    <p className="text-lg font-black text-slate-900">Clinic not available</p>
                    <p className="text-sm text-red-700">{error || 'The requested clinic could not be found.'}</p>
                    <div className="flex justify-center gap-3">
                        <Link
                            to="/patient/clinics"
                            className="inline-flex rounded-xl border border-primary px-5 py-2 text-sm font-black text-primary hover:bg-blue-50"
                        >
                            Back to Clinics
                        </Link>
                        <Link
                            to="/patient"
                            className="inline-flex rounded-xl border border-slate-300 px-5 py-2 text-sm font-black text-slate-700 hover:bg-slate-50"
                        >
                            Dashboard
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f4f6f8] text-slate-900">
            <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/92 backdrop-blur-sm">
                <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
                    <Link to="/patient" className="flex items-center gap-3">
                        <div className="grid size-10 place-items-center rounded-xl bg-primary text-white">
                            <span className="material-symbols-outlined text-[20px]">health_and_safety</span>
                        </div>
                        <div>
                            <p className="text-lg font-black tracking-tight">HealthSync</p>
                            <p className="text-xs text-slate-500">Clinic Discovery</p>
                        </div>
                    </Link>

                    <nav className="hidden items-center gap-8 md:flex">
                        <button type="button" onClick={() => navigate('/patient')} className="text-sm font-medium text-slate-700 hover:text-primary">
                            Find Doctors
                        </button>
                        <Link to="/patient/clinics" className="text-sm font-semibold text-primary">
                            Clinics
                        </Link>
                        <button type="button" onClick={() => navigate('/patient')} className="text-sm font-medium text-slate-700 hover:text-primary">
                            How It Works
                        </button>
                    </nav>

                    <div className="flex items-center gap-3">
                        <button type="button" className="grid size-10 place-items-center rounded-full bg-slate-100 text-slate-500">
                            <span className="material-symbols-outlined text-[20px]">notifications</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate('/patient/clinics')}
                            className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 shadow-sm"
                        >
                            <div className="grid size-9 place-items-center rounded-full bg-amber-100 text-xs font-black text-amber-700">
                                {extractInitials(user?.name)}
                            </div>
                            <span className="hidden max-w-[150px] truncate text-sm font-semibold text-slate-700 sm:inline">{user?.name}</span>
                            <span className="material-symbols-outlined text-[18px] text-slate-400">expand_more</span>
                        </button>
                    </div>
                </div>
            </header>

            <main className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
                <nav className="mb-5 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                    <Link to="/patient" className="hover:text-primary">Home</Link>
                    <span className="material-symbols-outlined text-[18px] text-slate-300">chevron_right</span>
                    <Link to="/patient/clinics" className="hover:text-primary">Clinics</Link>
                    <span className="material-symbols-outlined text-[18px] text-slate-300">chevron_right</span>
                    <span className="font-medium text-slate-900">{clinic.name}</span>
                </nav>

                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
                    <div className="space-y-6">
                        <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
                            <div className="relative h-[240px] sm:h-[320px]">
                                {clinicImage ? (
                                    <img src={clinicImage} alt={clinic.name} className="h-full w-full object-cover" />
                                ) : (
                                    <div className="flex h-full items-center justify-center bg-[linear-gradient(135deg,_#dbeafe,_#eff6ff_55%,_#f8fafc)]">
                                        <span className="material-symbols-outlined text-[160px] text-primary/25">apartment</span>
                                    </div>
                                )}

                                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-900/15 to-transparent" />
                                <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                                    <h1 className="text-4xl font-black tracking-tight text-white">{clinic.name}</h1>
                                    <p className="mt-2 flex items-center gap-2 text-sm text-slate-100">
                                        <span className="material-symbols-outlined text-[18px]">location_on</span>
                                        <span>{clinic.address || 'Address currently unavailable'}</span>
                                    </p>
                                </div>
                            </div>

                            <div className="grid gap-4 border-t border-slate-200 px-5 py-5 sm:grid-cols-[1fr_1fr_auto] sm:px-6">
                                <div>
                                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Consultation Fee</p>
                                    <p className="mt-2 text-lg font-bold text-slate-900">{consultationFees.summary}</p>
                                </div>
                                <div>
                                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Payment</p>
                                    <p className="mt-2 text-lg font-bold text-slate-900">{paymentSummary}</p>
                                </div>
                                {mapsUrl && (
                                    <a
                                        href={mapsUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white hover:bg-primary/90"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">map</span>
                                        View on Google Maps
                                    </a>
                                )}
                            </div>

                            <div className="border-t border-slate-100 px-5 py-6 sm:px-6">
                                <h2 className="text-2xl font-black text-slate-900">About the Clinic</h2>
                                <p className="mt-4 text-[15px] leading-8 text-slate-600">
                                    {clinic.description || 'Detailed clinic description is currently unavailable.'}
                                </p>
                                <p className="mt-4 text-[15px] leading-8 text-slate-600">
                                    Current specialties at this clinic include {specialtySummary}. Booking is handled through the doctor profiles listed below, where patients can review real availability and consultation details.
                                </p>
                            </div>
                        </section>

                        <section ref={doctorsSectionRef} className="space-y-5">
                            <div className="flex items-end justify-between gap-4">
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900">Doctors at this Clinic</h2>
                                    <p className="mt-1 text-sm text-slate-500">Choose a doctor to review pricing, availability, and book directly.</p>
                                </div>
                                <Link
                                    to="/patient"
                                    className="hidden rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-white sm:inline-flex"
                                >
                                    Back to Dashboard
                                </Link>
                            </div>

                            {doctors.length === 0 ? (
                                <div className="rounded-[24px] border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
                                    No doctors are currently linked to this clinic.
                                </div>
                            ) : (
                                <div className="grid gap-4 md:grid-cols-2">
                                    {doctors.map((doctor) => {
                                        const doctorInfo = getDoctorInfo(doctor);
                                        const mapping = resolveDoctorMapping(doctor, id);
                                        const specialtyName = mapping?.specialty?.name || 'Specialty updating';
                                        const doctorImage = resolveImageSource(doctor.image, apiAssetBase);
                                        const positionLabel = POSITION_LABELS[doctor.positionId] || 'Doctor';
                                        const consultationFee = priceLabels[doctorInfo.priceId] || 'Available on profile';
                                        const paymentMethod = paymentLabels[doctorInfo.paymentId] || 'Available on profile';

                                        return (
                                            <article
                                                key={doctor.id}
                                                className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-md"
                                            >
                                                <div className="flex gap-4">
                                                    <div className="size-20 shrink-0 overflow-hidden rounded-2xl bg-slate-100">
                                                        {doctorImage ? (
                                                            <img src={doctorImage} alt={doctor.name} className="h-full w-full object-cover object-top" />
                                                        ) : (
                                                            <div className="grid h-full w-full place-items-center bg-slate-100">
                                                                <span className="material-symbols-outlined text-4xl text-slate-400">person</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="min-w-0 flex-1">
                                                        <h3 className="truncate text-lg font-black text-slate-900">{doctor.name}</h3>
                                                        <p className="text-sm font-semibold text-primary">{specialtyName}</p>
                                                        <p className="mt-1 text-xs font-medium text-slate-500">{positionLabel}</p>
                                                        <p className="mt-3 text-sm leading-6 text-slate-600">
                                                            {summarizeText(doctorInfo.note || `Consultation at ${clinic.name}.`, 120)}
                                                        </p>

                                                        <div className="mt-4 grid gap-2 text-xs font-medium text-slate-500">
                                                            <p className="flex items-center gap-2">
                                                                <span className="material-symbols-outlined text-[16px] text-primary">payments</span>
                                                                <span>{consultationFee}</span>
                                                            </p>
                                                            <p className="flex items-center gap-2">
                                                                <span className="material-symbols-outlined text-[16px] text-primary">credit_card</span>
                                                                <span>{paymentMethod}</span>
                                                            </p>
                                                        </div>

                                                        <div className="mt-4 flex gap-3">
                                                            <Link
                                                                to={`/patient/doctor/${doctor.id}`}
                                                                className="inline-flex flex-1 items-center justify-center rounded-xl bg-primary/10 px-4 py-2.5 text-sm font-bold text-primary hover:bg-primary hover:text-white"
                                                            >
                                                                Book Appointment
                                                            </Link>
                                                        </div>
                                                    </div>
                                                </div>
                                            </article>
                                        );
                                    })}
                                </div>
                            )}
                        </section>
                    </div>

                    <aside className="space-y-4">
                        <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                            <h2 className="text-xl font-black text-slate-900">Medical Specialties</h2>
                            <div className="mt-4 flex flex-wrap gap-2">
                                {specialties.length > 0 ? (
                                    specialties.map((specialty) => (
                                        <span
                                            key={specialty.id}
                                            className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700"
                                        >
                                            {specialty.name}
                                        </span>
                                    ))
                                ) : (
                                    <p className="text-sm text-slate-500">No specialty information available.</p>
                                )}
                            </div>
                        </section>

                        <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                            <h2 className="text-xl font-black text-slate-900">Clinic Information</h2>
                            <div className="mt-4 space-y-3">
                                <div className="flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                                    <div className="grid size-10 place-items-center rounded-xl bg-blue-50 text-primary">
                                        <span className="material-symbols-outlined text-[20px]">groups</span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900">Doctors Available</p>
                                        <p className="text-sm text-slate-500">{doctors.length} doctor(s)</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                                    <div className="grid size-10 place-items-center rounded-xl bg-blue-50 text-primary">
                                        <span className="material-symbols-outlined text-[20px]">medical_services</span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900">Specialties</p>
                                        <p className="text-sm text-slate-500">{specialties.length} area(s)</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                                    <div className="grid size-10 place-items-center rounded-xl bg-blue-50 text-primary">
                                        <span className="material-symbols-outlined text-[20px]">payments</span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900">Consultation Range</p>
                                        <p className="text-sm text-slate-500">{consultationFees.summary}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                                    <div className="grid size-10 place-items-center rounded-xl bg-blue-50 text-primary">
                                        <span className="material-symbols-outlined text-[20px]">credit_card</span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900">Payment Options</p>
                                        <p className="text-sm text-slate-500">{paymentSummary}</p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="overflow-hidden rounded-[24px] bg-[linear-gradient(135deg,_#1d4ed8,_#2563eb_55%,_#3b82f6)] p-5 text-white shadow-lg shadow-blue-200/70">
                            <div className="relative">
                                <h3 className="text-2xl font-black">Need Help?</h3>
                                <p className="mt-3 text-sm leading-7 text-blue-50">
                                    Select a doctor below to review live availability and book your consultation in a few steps.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => doctorsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                                    className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-white px-4 py-3 text-sm font-bold text-primary hover:bg-slate-50"
                                >
                                    Browse Doctors
                                </button>
                                <span className="material-symbols-outlined absolute -bottom-9 -right-6 text-[96px] text-white/10">support_agent</span>
                            </div>
                        </section>
                    </aside>
                </div>
            </main>
        </div>
    );
};

export default ClinicDetail;
