import React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logoutUser } from '../store/slices/authSlice';
import { resetAiSession } from '../store/slices/aiSlice';
import apiClient, { getApiAssetBase } from '../utils/apiClient';
import PatientPortalFooter from '../components/layout/PatientPortalFooter';
import PatientPortalHeader from '../components/layout/PatientPortalHeader';
import { PATIENT_PORTAL_ROUTE_TARGETS } from '../components/layout/patientPortalConfig';

const POSITION_LABELS = {
    P0: 'Doctor',
    P1: 'Master',
    P2: 'PhD',
    P3: 'Associate Professor',
    P4: 'Professor',
};

const SPECIALTY_VISUALS = [
    { keywords: ['cardio', 'heart'], icon: 'favorite', accent: 'from-rose-100 to-red-50', iconTone: 'text-rose-600' },
    { keywords: ['derma', 'skin'], icon: 'dermatology', accent: 'from-amber-100 to-orange-50', iconTone: 'text-amber-600' },
    { keywords: ['neuro', 'brain'], icon: 'neurology', accent: 'from-violet-100 to-indigo-50', iconTone: 'text-violet-600' },
    { keywords: ['pedia', 'child'], icon: 'child_care', accent: 'from-sky-100 to-cyan-50', iconTone: 'text-sky-600' },
    { keywords: ['dental', 'tooth'], icon: 'dentistry', accent: 'from-teal-100 to-emerald-50', iconTone: 'text-teal-600' },
    { keywords: ['eye', 'ophthal', 'vision'], icon: 'visibility', accent: 'from-blue-100 to-slate-50', iconTone: 'text-blue-600' },
    { keywords: ['ortho', 'bone', 'joint'], icon: 'accessibility_new', accent: 'from-orange-100 to-amber-50', iconTone: 'text-orange-600' },
    { keywords: ['ear', 'nose', 'throat', 'ent'], icon: 'hearing', accent: 'from-emerald-100 to-lime-50', iconTone: 'text-emerald-600' },
];

const SPECIALTY_HIGHLIGHTS = {
    Cardiology: ['Heart Rhythm Review', 'Blood Pressure Care', 'Chest Pain Assessment', 'Prevention Planning'],
    Dermatology: ['Rashes & Eczema', 'Acne Management', 'Skin Lesion Review', 'Hair & Nail Care'],
    Neurology: ['Headache Review', 'Nerve Symptoms', 'Seizure Follow-up', 'Balance Assessment'],
    Pediatrics: ['Child Health Visits', 'Growth Monitoring', 'Common Illness Care', 'Parent Guidance'],
    Dentistry: ['Tooth Pain Review', 'Oral Hygiene Plans', 'Gum Care', 'Routine Checkups'],
    Ophthalmology: ['Vision Review', 'Red Eye Care', 'Glaucoma Monitoring', 'Cataract Follow-up'],
    Orthopedics: ['Joint Surgery', 'Sports Injuries', 'Fracture Care', 'Rehabilitation Plans'],
    'Ear Nose and Throat': ['Sinus Care', 'Hearing Review', 'Throat Symptoms', 'Airway Follow-up'],
};

const FALLBACK_HIGHLIGHTS = ['Specialist Review', 'Treatment Planning', 'Follow-up Care', 'Patient Guidance'];

const normalizeSearchText = (value) =>
    String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();

const resolveSpecialtyVisual = (specialty) => {
    const searchText = normalizeSearchText(specialty?.name);
    const matched = SPECIALTY_VISUALS.find((item) => item.keywords.some((keyword) => searchText.includes(keyword)));
    return matched || {
        icon: 'medical_services',
        accent: 'from-cyan-100 to-blue-50',
        iconTone: 'text-cyan-600',
    };
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

const resolveDoctorMapping = (doctor, specialtyId) => {
    const mappings = doctor?.doctor_clinic_specialties || [];
    return (
        mappings.find((item) => String(item.specialtyId || item.specialty?.id) === String(specialtyId)) ||
        mappings[0] ||
        null
    );
};

const SpecialtyDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);

    const [specialty, setSpecialty] = React.useState(null);
    const [doctors, setDoctors] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState('');

    const doctorsSectionRef = React.useRef(null);
    const apiAssetBase = React.useMemo(() => getApiAssetBase(), []);

    React.useEffect(() => {
        let cancelled = false;

        const loadPage = async () => {
            setLoading(true);
            setError('');

            try {
                const [specialtyResponse, doctorsResponse] = await Promise.all([
                    apiClient.get(`/v1/specialties/${id}`),
                    apiClient.get('/v1/doctors', { params: { specialtyId: id } }),
                ]);

                if (cancelled) return;

                const specialtyData = specialtyResponse.data;
                const doctorData = doctorsResponse.data?.data ?? doctorsResponse.data ?? [];

                setSpecialty(specialtyData);
                setDoctors(Array.isArray(doctorData) ? doctorData : []);
            } catch (requestError) {
                if (cancelled) return;

                setError(requestError.response?.data?.message || 'Unable to load this specialty right now.');
                setSpecialty(null);
                setDoctors([]);
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        if (id) {
            loadPage();
        }

        return () => {
            cancelled = true;
        };
    }, [id]);

    const specialtyVisual = React.useMemo(() => resolveSpecialtyVisual(specialty), [specialty]);
    const specialtyImage = React.useMemo(
        () => resolveImageSource(specialty?.image, apiAssetBase),
        [specialty?.image, apiAssetBase]
    );
    const specialtyHighlights = React.useMemo(
        () => SPECIALTY_HIGHLIGHTS[specialty?.name] || FALLBACK_HIGHLIGHTS,
        [specialty?.name]
    );

    const clinicCount = React.useMemo(() => {
        const uniqueClinics = new Set();
        for (const doctor of doctors) {
            const mapping = resolveDoctorMapping(doctor, id);
            const clinicId = mapping?.clinicId || mapping?.clinic?.id;
            if (clinicId) uniqueClinics.add(String(clinicId));
        }
        return uniqueClinics.size;
    }, [doctors, id]);

    const navigateToDashboardTarget = (portalTarget) => {
        navigate('/patient', { state: { portalTarget } });
    };

    const handleLogout = async () => {
        dispatch(resetAiSession());
        await dispatch(logoutUser());
        navigate('/login');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-100 text-slate-900">
                <PatientPortalHeader
                    user={user}
                    activeItem="doctors"
                    onHome={() => navigateToDashboardTarget(PATIENT_PORTAL_ROUTE_TARGETS.DASHBOARD)}
                    onFindDoctors={() => navigate('/patient/doctors')}
                    onClinics={() => navigate('/patient/clinics')}
                    onAiSupport={() => navigate('/patient/ai')}
                    onAppointments={() => navigateToDashboardTarget(PATIENT_PORTAL_ROUTE_TARGETS.APPOINTMENTS)}
                    onLogout={handleLogout}
                />
                <main className="mx-auto w-full max-w-[1240px] px-4 py-8 sm:px-8 sm:py-10">
                    <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
                        Loading specialty page...
                    </div>
                </main>
                <section className="bg-white">
                    <PatientPortalFooter />
                </section>
            </div>
        );
    }

    if (error || !specialty) {
        return (
            <div className="min-h-screen bg-slate-100 text-slate-900">
                <PatientPortalHeader
                    user={user}
                    activeItem="doctors"
                    onHome={() => navigateToDashboardTarget(PATIENT_PORTAL_ROUTE_TARGETS.DASHBOARD)}
                    onFindDoctors={() => navigate('/patient/doctors')}
                    onClinics={() => navigate('/patient/clinics')}
                    onAiSupport={() => navigate('/patient/ai')}
                    onAppointments={() => navigateToDashboardTarget(PATIENT_PORTAL_ROUTE_TARGETS.APPOINTMENTS)}
                    onLogout={handleLogout}
                />
                <main className="mx-auto w-full max-w-[1240px] px-4 py-8 sm:px-8 sm:py-10">
                    <div className="space-y-4 rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm">
                        <p className="text-lg font-black text-slate-900">Specialty not available</p>
                        <p className="text-sm text-red-700">{error || 'The requested specialty could not be found.'}</p>
                        <Link to="/patient" className="inline-flex rounded-xl border border-primary px-5 py-2 text-sm font-black text-primary hover:bg-blue-50">
                            Back to Dashboard
                        </Link>
                    </div>
                </main>
                <section className="bg-white">
                    <PatientPortalFooter />
                </section>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-100 text-slate-900">
            <PatientPortalHeader
                user={user}
                activeItem="doctors"
                onHome={() => navigateToDashboardTarget(PATIENT_PORTAL_ROUTE_TARGETS.DASHBOARD)}
                onFindDoctors={() => navigate('/patient/doctors')}
                onClinics={() => navigate('/patient/clinics')}
                onAiSupport={() => navigate('/patient/ai')}
                onAppointments={() => navigateToDashboardTarget(PATIENT_PORTAL_ROUTE_TARGETS.APPOINTMENTS)}
                onLogout={handleLogout}
            />

            <main className="mx-auto flex w-full max-w-[1240px] flex-col gap-8 px-4 py-8 sm:px-8">
                <nav className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
                    <Link to="/patient" className="hover:text-primary">Home</Link>
                    <span className="material-symbols-outlined text-sm">chevron_right</span>
                    <span className="text-slate-500">Specialties</span>
                    <span className="material-symbols-outlined text-sm">chevron_right</span>
                    <span className="text-primary">{specialty.name}</span>
                </nav>

                <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
                    <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
                        <div className="p-6 sm:p-8 lg:p-10">
                            <div className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-primary">
                                Medical Specialty
                            </div>
                            <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">{specialty.name}</h1>
                            <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
                                {specialty.description || 'This specialty supports diagnosis, treatment planning, and follow-up care for patients who need specialist attention.'}
                            </p>

                            <div className="mt-6 grid gap-3 sm:grid-cols-2">
                                {specialtyHighlights.map((item) => (
                                    <div key={item} className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                                        <span className="material-symbols-outlined text-primary">check_circle</span>
                                        <span>{item}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-8 flex flex-wrap gap-3">
                                <button
                                    type="button"
                                    onClick={() => doctorsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                                    className="rounded-xl bg-primary px-5 py-3 text-sm font-black text-white hover:bg-primary/90"
                                >
                                    Explore Doctors
                                </button>
                                <Link
                                    to="/patient"
                                    className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
                                >
                                    Back to Dashboard
                                </Link>
                            </div>
                        </div>

                        <div className={`relative flex min-h-[360px] items-center justify-center bg-gradient-to-br ${specialtyVisual.accent} p-8`}>
                            {specialtyImage ? (
                                <img src={specialtyImage} alt={specialty.name} className="h-full max-h-[360px] w-full rounded-[1.5rem] object-contain" />
                            ) : (
                                <div className="grid h-full min-h-[320px] w-full place-items-center rounded-[1.75rem] border border-white/70 bg-white/40 shadow-inner">
                                    <span className={`material-symbols-outlined text-[180px] ${specialtyVisual.iconTone}`}>{specialtyVisual.icon}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                <section className="grid gap-4 md:grid-cols-3">
                    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Doctors</p>
                        <p className="mt-3 text-3xl font-black text-slate-900">{doctors.length}</p>
                        <p className="mt-2 text-sm text-slate-500">Available doctors currently linked to this specialty.</p>
                    </article>
                    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Clinics</p>
                        <p className="mt-3 text-3xl font-black text-slate-900">{clinicCount}</p>
                        <p className="mt-2 text-sm text-slate-500">Clinics currently offering appointments in this field.</p>
                    </article>
                    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">What To Expect</p>
                        <p className="mt-3 text-lg font-black text-slate-900">Specialist review and treatment planning</p>
                        <p className="mt-2 text-sm text-slate-500">Choose a doctor, review availability, and book directly from the doctor profile page.</p>
                    </article>
                </section>

                <section ref={doctorsSectionRef} className="space-y-5">
                    <div className="flex flex-wrap items-end justify-between gap-3">
                        <div>
                            <h2 className="text-2xl font-black tracking-tight text-slate-900">Doctors in {specialty.name}</h2>
                            <p className="text-sm text-slate-500">Browse doctors currently assigned to this specialty.</p>
                        </div>
                        <Link
                            to="/patient/doctors"
                            className="rounded-xl border border-primary px-4 py-2 text-sm font-black text-primary hover:bg-blue-50"
                        >
                            Browse All Doctors
                        </Link>
                    </div>

                    {doctors.length === 0 ? (
                        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
                            No doctors are currently linked to this specialty.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {doctors.map((doctor) => {
                                const mapping = resolveDoctorMapping(doctor, id);
                                const doctorImage = resolveImageSource(doctor.image, apiAssetBase);
                                const clinicName = mapping?.clinic?.name || doctor.doctor_infor?.nameClinic || 'Clinic updating';
                                const clinicAddress = mapping?.clinic?.address || doctor.doctor_infor?.addressClinic || 'Address updating';
                                const position = POSITION_LABELS[doctor.positionId] || 'Specialist';
                                const summary = doctor.doctor_infor?.note || `${position} in ${specialty.name}`;

                                return (
                                    <article key={doctor.id} className="group rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:border-primary/30 hover:shadow-md">
                                        <div className="flex flex-col gap-5 md:flex-row">
                                            <div className="h-36 w-full shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 md:w-36">
                                                {doctorImage ? (
                                                    <img src={doctorImage} alt={doctor.name} className="h-full w-full object-cover object-top" />
                                                ) : (
                                                    <div className="grid h-full w-full place-items-center bg-slate-100">
                                                        <span className="material-symbols-outlined text-5xl text-slate-400">person</span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex flex-1 flex-col justify-between gap-4">
                                                <div className="space-y-3">
                                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                                        <div>
                                                            <h3 className="text-2xl font-black text-slate-900 transition group-hover:text-primary">{doctor.name}</h3>
                                                            <p className="text-sm font-semibold text-slate-500">{position}</p>
                                                        </div>
                                                        <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                                                            {specialty.name}
                                                        </div>
                                                    </div>

                                                    <p className="max-w-3xl text-sm leading-7 text-slate-600">{summary}</p>

                                                    <div className="grid gap-3 text-sm text-slate-500 sm:grid-cols-2">
                                                        <p className="flex items-start gap-2">
                                                            <span className="material-symbols-outlined text-[18px] text-primary">location_on</span>
                                                            <span>{clinicName}</span>
                                                        </p>
                                                        <p className="flex items-start gap-2">
                                                            <span className="material-symbols-outlined text-[18px] text-primary">home_health</span>
                                                            <span>{clinicAddress}</span>
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap gap-3">
                                                    <Link
                                                        to={`/patient/doctor/${doctor.id}`}
                                                        className="rounded-xl bg-primary px-5 py-3 text-sm font-black text-white hover:bg-primary/90"
                                                    >
                                                        Book Now
                                                    </Link>
                                                    <Link
                                                        to={`/patient/doctor/${doctor.id}`}
                                                        className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
                                                    >
                                                        View Profile
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
            </main>

            <section className="bg-white">
                <PatientPortalFooter />
            </section>
        </div>
    );
};

export default SpecialtyDetail;
