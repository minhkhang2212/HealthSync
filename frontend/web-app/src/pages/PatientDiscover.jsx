import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logoutUser } from '../store/slices/authSlice';
import { resetAiSession } from '../store/slices/aiSlice';
import { fetchSpecialties } from '../store/slices/specialtySlice';
import { fetchDoctors } from '../store/slices/doctorSlice';
import { fetchClinics } from '../store/slices/clinicSlice';
import { getApiAssetBase } from '../utils/apiClient';
import PatientPortalFooter from '../components/layout/PatientPortalFooter';
import PatientPortalHeader from '../components/layout/PatientPortalHeader';
import { PATIENT_PORTAL_ROUTE_TARGETS } from '../components/layout/patientPortalConfig';
import PatientDirectorySearchBar from '../components/discover/PatientDirectorySearchBar';
import {
    clearDiscoverRecentQueries,
    pushDiscoverRecentQuery,
    readDiscoverRecentQueries,
    removeDiscoverRecentQuery,
} from '../utils/discoverSearchHistory';

const TOP_SPECIALTY_COUNT = 3;
const TOP_CLINIC_COUNT = 2;
const TOP_DOCTOR_COUNT = 2;

const SPECIALTY_VISUALS = [
    { keywords: ['cardio', 'heart', 'tim mach'], icon: 'favorite', tone: 'bg-rose-50 text-rose-600' },
    { keywords: ['derma', 'skin', 'da lieu'], icon: 'dermatology', tone: 'bg-amber-50 text-amber-600' },
    { keywords: ['neuro', 'brain', 'than kinh'], icon: 'neurology', tone: 'bg-violet-50 text-violet-600' },
    { keywords: ['pedia', 'child', 'nhi'], icon: 'child_care', tone: 'bg-blue-50 text-blue-600' },
    { keywords: ['dental', 'tooth', 'rang'], icon: 'dentistry', tone: 'bg-cyan-50 text-cyan-600' },
    { keywords: ['eye', 'ophthal'], icon: 'visibility', tone: 'bg-sky-50 text-sky-600' },
    { keywords: ['ear', 'nose', 'throat', 'ent'], icon: 'hearing', tone: 'bg-emerald-50 text-emerald-600' },
];

const FALLBACK_SPECIALTY_TONES = [
    'bg-indigo-50 text-indigo-600',
    'bg-emerald-50 text-emerald-600',
    'bg-orange-50 text-orange-600',
    'bg-fuchsia-50 text-fuchsia-600',
    'bg-cyan-50 text-cyan-600',
];

const normalizeId = (value) => (value == null ? '' : String(value));

const normalizeSearchText = (value) =>
    String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();

const getDoctorRelations = (doctor) => doctor?.doctor_clinic_specialties || doctor?.doctorClinicSpecialties || [];

const getDoctorInfo = (doctor) => doctor?.doctor_infor || doctor?.doctorInfor || {};

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

const truncateText = (text, maxLength = 110) => {
    const value = String(text || '').trim();
    if (!value) return '';
    if (value.length <= maxLength) return value;
    return `${value.slice(0, maxLength - 1).trimEnd()}...`;
};

const extractInitials = (value) =>
    String(value || '')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((item) => item[0]?.toUpperCase() || '')
        .join('') || 'DR';

const resolveSpecialtyVisual = (specialty) => {
    const searchText = normalizeSearchText(specialty?.name);
    const matched = SPECIALTY_VISUALS.find((item) => item.keywords.some((keyword) => searchText.includes(keyword)));
    if (matched) return matched;

    const numericId = Number.parseInt(String(specialty?.id || 0), 10) || 0;
    return {
        icon: 'medical_services',
        tone: FALLBACK_SPECIALTY_TONES[Math.abs(numericId) % FALLBACK_SPECIALTY_TONES.length],
    };
};

const PatientDiscover = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const { user } = useSelector((state) => state.auth);
    const { doctors, loading: doctorsLoading, error: doctorsError } = useSelector((state) => state.doctor);
    const { clinics, loading: clinicsLoading, error: clinicsError } = useSelector((state) => state.clinic);
    const { specialties, loading: specialtiesLoading, error: specialtiesError } = useSelector((state) => state.specialty);

    const [searchQuery, setSearchQuery] = React.useState('');
    const [recentQueries, setRecentQueries] = React.useState(() => readDiscoverRecentQueries());

    const apiAssetBase = React.useMemo(() => getApiAssetBase(), []);

    React.useEffect(() => {
        if (!doctorsLoading && doctors.length === 0) {
            dispatch(fetchDoctors());
        }
        if (!clinicsLoading && clinics.length === 0) {
            dispatch(fetchClinics());
        }
        if (!specialtiesLoading && specialties.length === 0) {
            dispatch(fetchSpecialties());
        }
    }, [
        clinics.length,
        clinicsLoading,
        dispatch,
        doctors.length,
        doctorsLoading,
        specialties.length,
        specialtiesLoading,
    ]);

    const clinicMeta = React.useMemo(() => {
        const meta = new Map();

        clinics.forEach((clinic) => {
            meta.set(normalizeId(clinic.id), {
                doctorIds: new Set(),
                specialties: new Map(),
            });
        });

        doctors.forEach((doctor) => {
            getDoctorRelations(doctor).forEach((relation) => {
                const clinicId = normalizeId(relation.clinicId || relation.clinic?.id);
                if (!clinicId) return;

                if (!meta.has(clinicId)) {
                    meta.set(clinicId, {
                        doctorIds: new Set(),
                        specialties: new Map(),
                    });
                }

                const clinicEntry = meta.get(clinicId);
                clinicEntry.doctorIds.add(normalizeId(doctor.id));

                const specialtyId = normalizeId(relation.specialtyId || relation.specialty?.id);
                if (specialtyId && relation.specialty) {
                    clinicEntry.specialties.set(specialtyId, relation.specialty);
                }
            });
        });

        return meta;
    }, [clinics, doctors]);

    const specialtyDoctorCount = React.useMemo(() => {
        const counts = new Map();

        doctors.forEach((doctor) => {
            const seen = new Set();
            getDoctorRelations(doctor).forEach((relation) => {
                const specialtyId = normalizeId(relation.specialtyId || relation.specialty?.id);
                if (!specialtyId || seen.has(specialtyId)) return;
                seen.add(specialtyId);
                counts.set(specialtyId, (counts.get(specialtyId) || 0) + 1);
            });
        });

        return counts;
    }, [doctors]);

    const orderedSpecialties = React.useMemo(
        () =>
            [...specialties].sort((left, right) => {
                const countDelta =
                    (specialtyDoctorCount.get(normalizeId(right.id)) || 0) -
                    (specialtyDoctorCount.get(normalizeId(left.id)) || 0);
                if (countDelta !== 0) return countDelta;
                return String(left.name || '').localeCompare(String(right.name || ''));
            }),
        [specialties, specialtyDoctorCount]
    );

    const orderedClinics = React.useMemo(
        () =>
            [...clinics].sort((left, right) => {
                const countDelta =
                    (clinicMeta.get(normalizeId(right.id))?.doctorIds.size || 0) -
                    (clinicMeta.get(normalizeId(left.id))?.doctorIds.size || 0);
                if (countDelta !== 0) return countDelta;
                return String(left.name || '').localeCompare(String(right.name || ''));
            }),
        [clinicMeta, clinics]
    );

    const doctorProfiles = React.useMemo(
        () =>
            doctors.map((doctor) => {
                const relations = getDoctorRelations(doctor);
                const doctorInfo = getDoctorInfo(doctor);
                const specialtyMap = new Map();
                const clinicMap = new Map();

                relations.forEach((relation) => {
                    const specialtyId = normalizeId(relation.specialtyId || relation.specialty?.id);
                    const clinicId = normalizeId(relation.clinicId || relation.clinic?.id);

                    if (specialtyId) {
                        specialtyMap.set(
                            specialtyId,
                            relation.specialty || {
                                id: specialtyId,
                                name: relation.specialty?.name || 'Specialty updating',
                            }
                        );
                    }

                    if (clinicId) {
                        clinicMap.set(
                            clinicId,
                            relation.clinic || {
                                id: clinicId,
                                name: relation.clinic?.name || doctorInfo.nameClinic || 'Clinic updating',
                                address: relation.clinic?.address || doctorInfo.addressClinic || 'Clinic address updating',
                            }
                        );
                    }
                });

                const primaryRelation = relations[0] || null;
                const specialtyEntries = [...specialtyMap.values()];
                const clinicEntries = [...clinicMap.values()];
                const specialtyNames = specialtyEntries.map((item) => item.name).filter(Boolean);
                const clinicNames = clinicEntries.map((item) => item.name).filter(Boolean);
                const clinicAddresses = clinicEntries.map((item) => item.address).filter(Boolean);
                const primarySpecialtyName = primaryRelation?.specialty?.name || specialtyNames[0] || 'Specialty updating';
                const primaryClinicName = primaryRelation?.clinic?.name || doctorInfo.nameClinic || clinicNames[0] || 'Clinic updating';
                const primaryClinicAddress =
                    primaryRelation?.clinic?.address || doctorInfo.addressClinic || clinicAddresses[0] || 'Clinic address updating';
                const summary = truncateText(
                    doctorInfo.note || `${primarySpecialtyName} consultations available at ${primaryClinicName}.`,
                    150
                );
                const richnessScore =
                    specialtyEntries.length * 2 +
                    clinicEntries.length * 2 +
                    Number(Boolean(doctor.image)) * 2 +
                    Number(Boolean(doctorInfo.note)) * 2 +
                    Number(Boolean(doctor.email)) +
                    Number(Boolean(doctor.phoneNumber || doctor.phone_number)) +
                    Number(Boolean(primaryClinicAddress));

                return {
                    id: normalizeId(doctor.id),
                    doctor,
                    imageSrc: resolveImageSource(doctor.image, apiAssetBase),
                    specialtyNames,
                    clinicNames,
                    clinicAddresses,
                    primarySpecialtyName,
                    primaryClinicName,
                    primaryClinicAddress,
                    summary,
                    mappingCount: relations.length,
                    richnessScore,
                };
            }),
        [apiAssetBase, doctors]
    );

    const orderedDoctors = React.useMemo(
        () =>
            [...doctorProfiles].sort((left, right) => {
                if (right.mappingCount !== left.mappingCount) return right.mappingCount - left.mappingCount;
                if (right.richnessScore !== left.richnessScore) return right.richnessScore - left.richnessScore;
                return String(left.doctor.name || '').localeCompare(String(right.doctor.name || ''));
            }),
        [doctorProfiles]
    );

    const normalizedQuery = React.useMemo(() => normalizeSearchText(searchQuery).trim(), [searchQuery]);
    const hasActiveQuery = normalizedQuery.length > 0;

    const filteredSpecialties = React.useMemo(() => {
        if (!hasActiveQuery) return orderedSpecialties.slice(0, TOP_SPECIALTY_COUNT);

        return orderedSpecialties.filter((specialty) => {
            const haystack = normalizeSearchText([specialty.name, specialty.description].filter(Boolean).join(' '));
            return haystack.includes(normalizedQuery);
        });
    }, [hasActiveQuery, normalizedQuery, orderedSpecialties]);

    const filteredClinics = React.useMemo(() => {
        if (!hasActiveQuery) return orderedClinics.slice(0, TOP_CLINIC_COUNT);

        return orderedClinics.filter((clinic) => {
            const specialtiesText = [...(clinicMeta.get(normalizeId(clinic.id))?.specialties.values() || [])]
                .map((specialty) => specialty?.name)
                .join(' ');
            const haystack = normalizeSearchText([clinic.name, clinic.address, clinic.description, specialtiesText].filter(Boolean).join(' '));
            return haystack.includes(normalizedQuery);
        });
    }, [clinicMeta, hasActiveQuery, normalizedQuery, orderedClinics]);

    const filteredDoctors = React.useMemo(() => {
        if (!hasActiveQuery) return orderedDoctors.slice(0, TOP_DOCTOR_COUNT);

        return orderedDoctors.filter((profile) => {
            const haystack = normalizeSearchText(
                [
                    profile.doctor.name,
                    profile.doctor.email,
                    profile.summary,
                    ...profile.specialtyNames,
                    ...profile.clinicNames,
                ]
                    .filter(Boolean)
                    .join(' ')
            );

            return haystack.includes(normalizedQuery);
        });
    }, [hasActiveQuery, normalizedQuery, orderedDoctors]);

    const pageError = doctorsError || clinicsError || specialtiesError;
    const loading = doctorsLoading || clinicsLoading || specialtiesLoading;
    const hasAnyMatches = filteredSpecialties.length > 0 || filteredClinics.length > 0 || filteredDoctors.length > 0;

    const navigateToDashboardTarget = (portalTarget) => {
        navigate('/patient', { state: { portalTarget } });
    };

    const handleLogout = async () => {
        dispatch(resetAiSession());
        await dispatch(logoutUser());
        navigate('/login');
    };

    const handleSearchSubmit = () => {
        const trimmedQuery = searchQuery.trim();
        if (!trimmedQuery) return;
        setRecentQueries(pushDiscoverRecentQuery(trimmedQuery));
    };

    const handleRecentQueryClick = (query) => {
        setSearchQuery(query);
    };

    const handleRemoveRecentQuery = (query) => {
        setRecentQueries(removeDiscoverRecentQuery(query));
    };

    const handleClearRecentQueries = () => {
        setRecentQueries(clearDiscoverRecentQueries());
    };

    const renderSpecialtyItem = (specialty) => {
        const doctorCount = specialtyDoctorCount.get(normalizeId(specialty.id)) || 0;
        const specialtyVisual = resolveSpecialtyVisual(specialty);
        const specialtyImage = resolveImageSource(specialty.image, apiAssetBase);

        return (
            <button
                key={specialty.id}
                type="button"
                onClick={() => navigate(`/patient/specialties/${specialty.id}`)}
                className="group flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-blue-50/60"
            >
                <div className="flex min-w-0 items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-100">
                        {specialtyImage ? (
                            <img src={specialtyImage} alt={specialty.name} className="h-full w-full object-cover" />
                        ) : (
                            <span className={`grid h-full w-full place-items-center text-xl ${specialtyVisual.tone}`}>
                                <span className="material-symbols-outlined">{specialtyVisual.icon}</span>
                            </span>
                        )}
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-lg font-black text-slate-900">{specialty.name}</p>
                        <p className="mt-1 text-sm text-slate-500">
                            {truncateText(specialty.description, 84) || `${doctorCount} linked doctor(s) ready to book.`}
                        </p>
                    </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                        {doctorCount} doctor{doctorCount === 1 ? '' : 's'}
                    </span>
                    <span className="material-symbols-outlined text-slate-300 transition group-hover:translate-x-1 group-hover:text-primary">
                        chevron_right
                    </span>
                </div>
            </button>
        );
    };

    const renderClinicItem = (clinic) => {
        const imageSrc = resolveImageSource(clinic.image, apiAssetBase);
        const meta = clinicMeta.get(normalizeId(clinic.id));
        const doctorCount = meta?.doctorIds.size || 0;
        const specialtyCount = meta?.specialties.size || 0;

        return (
            <button
                key={clinic.id}
                type="button"
                onClick={() => navigate(`/patient/clinics/${clinic.id}`)}
                className="group flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-blue-50/60"
            >
                <div className="flex min-w-0 items-center gap-4">
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-slate-100">
                        {imageSrc ? (
                            <img src={imageSrc} alt={clinic.name} className="h-full w-full object-cover" />
                        ) : (
                            <div className="grid h-full w-full place-items-center bg-[linear-gradient(135deg,_#dbeafe,_#eff6ff_55%,_#f8fafc)] text-primary/60">
                                <span className="material-symbols-outlined text-2xl">apartment</span>
                            </div>
                        )}
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-lg font-black text-slate-900">{clinic.name}</p>
                        <p className="mt-1 text-sm text-slate-500">{clinic.address || 'Address currently unavailable'}</p>
                        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                            {doctorCount} doctor{doctorCount === 1 ? '' : 's'} • {specialtyCount} specialt{specialtyCount === 1 ? 'y' : 'ies'}
                        </p>
                    </div>
                </div>
                <span className="material-symbols-outlined shrink-0 text-slate-300 transition group-hover:translate-x-1 group-hover:text-primary">
                    chevron_right
                </span>
            </button>
        );
    };

    const renderDoctorItem = (profile) => (
        <Link
            key={profile.id}
            to={`/patient/doctor/${profile.id}`}
            className="group flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-blue-50/60"
        >
            <div className="flex min-w-0 items-center gap-4">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-slate-100 ring-2 ring-primary/10">
                    {profile.imageSrc ? (
                        <img src={profile.imageSrc} alt={profile.doctor.name} className="h-full w-full object-cover object-top" />
                    ) : (
                        <div className="grid h-full w-full place-items-center bg-slate-900 text-sm font-black text-white">
                            {extractInitials(profile.doctor.name)}
                        </div>
                    )}
                </div>
                <div className="min-w-0">
                    <p className="truncate text-lg font-black text-slate-900">{profile.doctor.name}</p>
                    <p className="mt-1 text-sm font-semibold text-primary">{profile.primarySpecialtyName}</p>
                    <p className="mt-2 text-sm text-slate-500">{profile.primaryClinicName}</p>
                    <p className="mt-1 text-sm text-slate-500">{truncateText(profile.summary, 88)}</p>
                </div>
            </div>
            <span className="shrink-0 rounded-xl border border-primary/20 px-4 py-2 text-sm font-bold text-primary transition group-hover:bg-primary group-hover:text-white">
                Book
            </span>
        </Link>
    );

    return (
        <div className="min-h-screen bg-[#f4f7fb] text-slate-900">
            <PatientPortalHeader
                user={user}
                onHome={() => navigateToDashboardTarget(PATIENT_PORTAL_ROUTE_TARGETS.DASHBOARD)}
                onFindDoctors={() => navigate('/patient/doctors')}
                onClinics={() => navigate('/patient/clinics')}
                onAiSupport={() => navigate('/patient/ai')}
                onAppointments={() => navigateToDashboardTarget(PATIENT_PORTAL_ROUTE_TARGETS.APPOINTMENTS)}
                onLogout={handleLogout}
            />

            <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-8 sm:py-10">
                <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                    <Link to="/patient" className="font-medium hover:text-primary">
                        Home
                    </Link>
                    <span className="material-symbols-outlined text-base text-slate-300">chevron_right</span>
                    <span className="font-semibold text-slate-900">Discover</span>
                </nav>

                <section className="rounded-[2rem] border border-slate-200 bg-[radial-gradient(circle_at_top_right,_rgba(59,130,246,0.12),_transparent_35%),linear-gradient(180deg,_#ffffff,_#f8fbff)] p-5 shadow-sm sm:p-6">
                    <div className="space-y-3">
                        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-primary">Quick Search & Discovery</p>
                        <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                            Explore specialties, clinics, and doctors from one place
                        </h1>
                        <p className="max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
                            Start with a broad search, compare the best matches, then jump directly into the page that fits your care needs.
                        </p>
                    </div>

                    <div className="mt-6">
                        <PatientDirectorySearchBar
                            mode="search"
                            value={searchQuery}
                            onChange={setSearchQuery}
                            onSubmit={handleSearchSubmit}
                            placeholder="Search specialty, doctor, or clinic..."
                            actionLabel="Search"
                        />
                    </div>
                </section>

                <section className="mt-8">
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <h2 className="text-sm font-black uppercase tracking-[0.16em] text-slate-500">Recent Searches</h2>
                        {recentQueries.length > 0 && (
                            <button
                                type="button"
                                onClick={handleClearRecentQueries}
                                className="text-sm font-bold text-primary hover:underline"
                            >
                                Clear All
                            </button>
                        )}
                    </div>

                    {recentQueries.length > 0 ? (
                        <div className="flex flex-wrap gap-3">
                            {recentQueries.map((query) => (
                                <div
                                    key={query}
                                    className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm"
                                >
                                    <button
                                        type="button"
                                        onClick={() => handleRecentQueryClick(query)}
                                        className="inline-flex items-center gap-2 text-sm font-medium text-slate-700"
                                    >
                                        <span aria-hidden="true" className="material-symbols-outlined text-sm text-slate-400">history</span>
                                        <span>{query}</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveRecentQuery(query)}
                                        aria-label={`Remove recent search ${query}`}
                                        className="grid h-6 w-6 place-items-center rounded-full text-slate-300 transition hover:bg-red-50 hover:text-red-500"
                                    >
                                        <span aria-hidden="true" className="material-symbols-outlined text-sm">close</span>
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-4 text-sm text-slate-500">
                            Saved queries will appear here after you submit a search.
                        </div>
                    )}
                </section>

                {pageError && (
                    <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {pageError}
                    </div>
                )}

                {loading ? (
                    <div className="mt-8 rounded-[2rem] border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">
                        Loading discover results...
                    </div>
                ) : hasActiveQuery && !hasAnyMatches ? (
                    <div className="mt-8 rounded-[2rem] border border-slate-200 bg-white p-10 text-center shadow-sm">
                        <p className="text-lg font-black text-slate-900">No matches found</p>
                        <p className="mt-2 text-sm text-slate-500">
                            Try another search term to explore specialties, clinics, and doctor profiles.
                        </p>
                    </div>
                ) : (
                    <div className="mt-10 space-y-10">
                        {(!hasActiveQuery || filteredSpecialties.length > 0) && (
                            <section>
                                <div className="mb-4 flex items-center justify-between gap-3 px-2">
                                    <h2 className="text-sm font-black uppercase tracking-[0.16em] text-slate-500">Top Specialties</h2>
                                    <span className="text-xs font-semibold text-slate-400">
                                        {hasActiveQuery ? `${filteredSpecialties.length} match(es)` : 'Top picks'}
                                    </span>
                                </div>
                                <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
                                    {filteredSpecialties.length > 0 ? (
                                        <div className="divide-y divide-slate-100">{filteredSpecialties.map((specialty) => renderSpecialtyItem(specialty))}</div>
                                    ) : (
                                        <div className="px-5 py-6 text-sm text-slate-500">No specialties available right now.</div>
                                    )}
                                </div>
                            </section>
                        )}

                        {(!hasActiveQuery || filteredClinics.length > 0) && (
                            <section>
                                <div className="mb-4 flex items-center justify-between gap-3 px-2">
                                    <h2 className="text-sm font-black uppercase tracking-[0.16em] text-slate-500">Medical Facilities</h2>
                                    <span className="text-xs font-semibold text-slate-400">
                                        {hasActiveQuery ? `${filteredClinics.length} match(es)` : 'Top picks'}
                                    </span>
                                </div>
                                <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
                                    {filteredClinics.length > 0 ? (
                                        <div className="divide-y divide-slate-100">{filteredClinics.map((clinic) => renderClinicItem(clinic))}</div>
                                    ) : (
                                        <div className="px-5 py-6 text-sm text-slate-500">No clinics available right now.</div>
                                    )}
                                </div>
                            </section>
                        )}

                        {(!hasActiveQuery || filteredDoctors.length > 0) && (
                            <section>
                                <div className="mb-4 flex items-center justify-between gap-3 px-2">
                                    <h2 className="text-sm font-black uppercase tracking-[0.16em] text-slate-500">Featured Doctors</h2>
                                    <span className="text-xs font-semibold text-slate-400">
                                        {hasActiveQuery ? `${filteredDoctors.length} match(es)` : 'Top picks'}
                                    </span>
                                </div>
                                <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
                                    {filteredDoctors.length > 0 ? (
                                        <div className="divide-y divide-slate-100">{filteredDoctors.map((profile) => renderDoctorItem(profile))}</div>
                                    ) : (
                                        <div className="px-5 py-6 text-sm text-slate-500">No doctors available right now.</div>
                                    )}
                                </div>
                            </section>
                        )}
                    </div>
                )}
            </main>

            <section className="bg-white">
                <PatientPortalFooter />
            </section>
        </div>
    );
};

export default PatientDiscover;
