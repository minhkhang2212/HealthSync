import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logoutUser } from '../store/slices/authSlice';
import { resetAiSession } from '../store/slices/aiSlice';
import { fetchClinics } from '../store/slices/clinicSlice';
import { fetchDoctors } from '../store/slices/doctorSlice';
import { fetchSpecialties } from '../store/slices/specialtySlice';
import apiClient, { getApiAssetBase } from '../utils/apiClient';
import { readAllcodeCache, writeAllcodeCache } from '../utils/allcodeCache';
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

const DEFAULT_FILTERS = {
    search: '',
    location: '',
    specialtyIds: [],
    clinicId: '',
    gender: 'all',
    sort: 'relevance',
};

const PAGE_SIZE = 4;

const SORT_LABELS = {
    relevance: 'Relevancy',
    price_desc: 'Price: High to Low',
    price_asc: 'Price: Low to High',
};

const normalizeId = (value) => (value == null ? '' : String(value));

const normalizeSearchText = (value) =>
    String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();

const getDoctorRelations = (doctor) => doctor?.doctor_clinic_specialties || doctor?.doctorClinicSpecialties || [];

const getDoctorInfo = (doctor) => doctor?.doctor_infor || doctor?.doctorInfor || {};

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

const parseNumericAmount = (value) => {
    const matched = String(value || '').match(/(\d+)/);
    if (!matched) return null;
    return Number.parseInt(matched[1], 10);
};

const formatPrice = (value) => {
    const label = String(value || '').trim();
    if (!label) return 'Available on profile';
    const matched = label.match(/^(\d+)\s*GBP$/i);
    if (matched) return `GBP ${matched[1]}`;
    return label;
};

const truncateText = (text, maxLength = 170) => {
    const value = String(text || '').trim();
    if (!value) return '';
    if (value.length <= maxLength) return value;
    return `${value.slice(0, maxLength - 1).trimEnd()}...`;
};

const resolveGenderLabel = (gender) => {
    if (gender === 'M') return 'Male';
    if (gender === 'F') return 'Female';
    if (gender === 'O') return 'Other';
    return 'Any';
};

const buildInitialFilters = (state) => {
    const initialFilters = state?.initialFilters || {};
    const aiPrefill = state?.aiPrefill || null;
    const specialtyId = normalizeId(aiPrefill?.specialtyId || initialFilters.specialtyId);
    const clinicId = normalizeId(initialFilters.clinicId || aiPrefill?.clinicId);

    return {
        ...DEFAULT_FILTERS,
        search: aiPrefill?.specialtyName || initialFilters.search || '',
        location: aiPrefill?.locationQuery || initialFilters.location || '',
        specialtyIds: specialtyId ? [specialtyId] : [],
        clinicId,
        sort: initialFilters.sort || DEFAULT_FILTERS.sort,
    };
};

const compareNullableNumbers = (left, right, descending = false) => {
    const leftMissing = left == null;
    const rightMissing = right == null;
    if (leftMissing && rightMissing) return 0;
    if (leftMissing) return 1;
    if (rightMissing) return -1;
    return descending ? right - left : left - right;
};

const PatientDoctorDirectory = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();

    const { user } = useSelector((state) => state.auth);
    const { doctors, loading: doctorsLoading, error: doctorsError } = useSelector((state) => state.doctor);
    const { clinics, loading: clinicsLoading, error: clinicsError } = useSelector((state) => state.clinic);
    const { specialties, loading: specialtiesLoading, error: specialtiesError } = useSelector((state) => state.specialty);

    const [draftFilters, setDraftFilters] = React.useState(DEFAULT_FILTERS);
    const [appliedFilters, setAppliedFilters] = React.useState(DEFAULT_FILTERS);
    const [priceLabels, setPriceLabels] = React.useState({});
    const [priceLoading, setPriceLoading] = React.useState(true);
    const [currentPage, setCurrentPage] = React.useState(1);

    const apiAssetBase = React.useMemo(() => getApiAssetBase(), []);
    const incomingFilters = React.useMemo(() => buildInitialFilters(location.state), [location.state]);

    React.useEffect(() => {
        setDraftFilters(incomingFilters);
        setAppliedFilters(incomingFilters);
        setCurrentPage(1);
    }, [incomingFilters]);

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

    React.useEffect(() => {
        let cancelled = false;

        const loadPrices = async () => {
            setPriceLoading(true);
            try {
                const nextPriceLabels = await loadAllcodeMap('PRICE');
                if (cancelled) return;
                setPriceLabels(nextPriceLabels);
            } catch {
                if (cancelled) return;
                setPriceLabels({});
            } finally {
                if (!cancelled) {
                    setPriceLoading(false);
                }
            }
        };

        loadPrices();

        return () => {
            cancelled = true;
        };
    }, []);

    const specialtyLabelById = React.useMemo(
        () => Object.fromEntries((specialties || []).map((item) => [normalizeId(item.id), item.name])),
        [specialties]
    );

    const clinicLabelById = React.useMemo(
        () => Object.fromEntries((clinics || []).map((item) => [normalizeId(item.id), item.name])),
        [clinics]
    );

    const doctorProfiles = React.useMemo(() => {
        return doctors.map((doctor) => {
            const relations = getDoctorRelations(doctor);
            const doctorInfo = getDoctorInfo(doctor);
            const specialtyMap = new Map();
            const clinicMap = new Map();

            relations.forEach((relation) => {
                const specialtyId = normalizeId(relation.specialtyId || relation.specialty?.id);
                const clinicId = normalizeId(relation.clinicId || relation.clinic?.id);

                if (specialtyId) {
                    specialtyMap.set(specialtyId, relation.specialty || { id: specialtyId, name: relation.specialty?.name || 'Specialty updating' });
                }

                if (clinicId) {
                    clinicMap.set(clinicId, relation.clinic || {
                        id: clinicId,
                        name: relation.clinic?.name || doctorInfo.nameClinic || 'Clinic updating',
                        address: relation.clinic?.address || doctorInfo.addressClinic || 'Clinic address updating',
                    });
                }
            });

            const primaryRelation = relations[0] || null;
            const specialtyEntries = [...specialtyMap.values()];
            const clinicEntries = [...clinicMap.values()];
            const specialtyNames = specialtyEntries.map((item) => item.name).filter(Boolean);
            const clinicNames = clinicEntries.map((item) => item.name).filter(Boolean);
            const clinicAddresses = clinicEntries.map((item) => item.address).filter(Boolean);
            const priceLabel = formatPrice(priceLabels[doctorInfo.priceId] || '');
            const priceValue = parseNumericAmount(priceLabels[doctorInfo.priceId] || '');
            const positionLabel = POSITION_LABELS[doctor.positionId] || 'Doctor';
            const primarySpecialtyName = primaryRelation?.specialty?.name || specialtyNames[0] || 'Specialty updating';
            const primaryClinicName = primaryRelation?.clinic?.name || doctorInfo.nameClinic || clinicNames[0] || 'Clinic updating';
            const primaryClinicAddress = primaryRelation?.clinic?.address || doctorInfo.addressClinic || clinicAddresses[0] || 'Clinic address updating';

            return {
                id: normalizeId(doctor.id),
                doctor,
                imageSrc: resolveImageSource(doctor.image, apiAssetBase),
                summary: truncateText(doctorInfo.note || `${positionLabel} available for consultation at ${primaryClinicName}.`, 180),
                specialtyIds: specialtyEntries.map((item) => normalizeId(item.id)),
                specialtyNames,
                clinicIds: clinicEntries.map((item) => normalizeId(item.id)),
                clinicNames,
                clinicAddresses,
                primarySpecialtyName,
                primaryClinicName,
                primaryClinicAddress,
                positionLabel,
                priceLabel,
                priceValue,
                gender: doctor.gender || '',
            };
        });
    }, [apiAssetBase, doctors, priceLabels]);

    const filteredDoctors = React.useMemo(() => {
        const keyword = normalizeSearchText(appliedFilters.search).trim();
        const locationKeyword = normalizeSearchText(appliedFilters.location).trim();
        const specialtyIds = appliedFilters.specialtyIds.map(normalizeId).filter(Boolean);
        const clinicId = normalizeId(appliedFilters.clinicId);
        const gender = appliedFilters.gender;

        const filtered = doctorProfiles.filter((profile) => {
            if (keyword) {
                const haystack = normalizeSearchText(
                    [
                        profile.doctor.name,
                        profile.doctor.email,
                        profile.summary,
                        ...profile.specialtyNames,
                        ...profile.clinicNames,
                    ].filter(Boolean).join(' ')
                );
                if (!haystack.includes(keyword)) return false;
            }

            if (locationKeyword) {
                const locationHaystack = normalizeSearchText(
                    [...profile.clinicNames, ...profile.clinicAddresses, profile.primaryClinicAddress].filter(Boolean).join(' ')
                );
                if (!locationHaystack.includes(locationKeyword)) return false;
            }

            if (specialtyIds.length > 0 && !specialtyIds.some((specialtyId) => profile.specialtyIds.includes(specialtyId))) {
                return false;
            }

            if (clinicId && !profile.clinicIds.includes(clinicId)) {
                return false;
            }

            if (gender !== 'all' && profile.gender !== gender) {
                return false;
            }

            return true;
        });

        const selectedSpecialties = new Set(specialtyIds);

        return filtered.sort((left, right) => {
            if (appliedFilters.sort === 'price_desc') {
                const feeDelta = compareNullableNumbers(left.priceValue, right.priceValue, true);
                if (feeDelta !== 0) return feeDelta;
            } else if (appliedFilters.sort === 'price_asc') {
                const feeDelta = compareNullableNumbers(left.priceValue, right.priceValue);
                if (feeDelta !== 0) return feeDelta;
            } else {
                const leftMatchCount = left.specialtyIds.filter((item) => selectedSpecialties.has(item)).length;
                const rightMatchCount = right.specialtyIds.filter((item) => selectedSpecialties.has(item)).length;
                if (rightMatchCount !== leftMatchCount) return rightMatchCount - leftMatchCount;

                const clinicDelta = right.clinicIds.length - left.clinicIds.length;
                if (clinicDelta !== 0) return clinicDelta;

                const specialtyDelta = right.specialtyIds.length - left.specialtyIds.length;
                if (specialtyDelta !== 0) return specialtyDelta;

                const knownPriceDelta = Number(left.priceValue == null) - Number(right.priceValue == null);
                if (knownPriceDelta !== 0) return knownPriceDelta;
            }

            return String(left.doctor.name || '').localeCompare(String(right.doctor.name || ''));
        });
    }, [appliedFilters, doctorProfiles]);

    const filteredSpecialtyCount = React.useMemo(() => {
        const specialtyIds = new Set();
        filteredDoctors.forEach((profile) => profile.specialtyIds.forEach((item) => specialtyIds.add(item)));
        return specialtyIds.size;
    }, [filteredDoctors]);

    const totalPages = Math.max(1, Math.ceil(filteredDoctors.length / PAGE_SIZE));
    const pagedDoctors = filteredDoctors.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    React.useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    const activeFilterChips = React.useMemo(() => {
        const chips = [];
        if (appliedFilters.search.trim()) chips.push(`Search: ${appliedFilters.search.trim()}`);
        if (appliedFilters.location.trim()) chips.push(`Location: ${appliedFilters.location.trim()}`);
        if (appliedFilters.clinicId) {
            chips.push(`Clinic: ${clinicLabelById[normalizeId(appliedFilters.clinicId)] || `Clinic #${appliedFilters.clinicId}`}`);
        }
        appliedFilters.specialtyIds.forEach((specialtyId) => {
            chips.push(`Specialty: ${specialtyLabelById[normalizeId(specialtyId)] || `Specialty #${specialtyId}`}`);
        });
        if (appliedFilters.gender !== 'all') chips.push(`Gender: ${resolveGenderLabel(appliedFilters.gender)}`);
        if (appliedFilters.sort !== 'relevance') chips.push(SORT_LABELS[appliedFilters.sort]);
        return chips;
    }, [appliedFilters, clinicLabelById, specialtyLabelById]);

    const directoryNotice = React.useMemo(() => {
        if (location.state?.aiPrefill) {
            const specialtyName = location.state.aiPrefill.specialtyName || 'AI-recommended specialists';
            const locationLabel = location.state.aiPrefill.locationQuery
                ? ` near ${location.state.aiPrefill.locationQuery}`
                : '';
            return {
                title: 'AI Recommendation Applied',
                description: `Showing specialists for ${specialtyName}${locationLabel}.`,
            };
        }

        if (location.state?.initialFilters) {
            return {
                title: 'Dashboard Filters Applied',
                description: 'The doctor directory opened using the filters you were already viewing on the dashboard.',
            };
        }

        return null;
    }, [location.state]);

    const pageError = doctorsError || clinicsError || specialtiesError;
    const loading = doctorsLoading || clinicsLoading || specialtiesLoading || priceLoading;

    const navigateToDashboardTarget = (portalTarget) => {
        navigate('/patient', { state: { portalTarget } });
    };

    const handleLogout = async () => {
        dispatch(resetAiSession());
        await dispatch(logoutUser());
        navigate('/login');
    };

    const toggleDraftSpecialty = (specialtyId) => {
        const normalizedId = normalizeId(specialtyId);
        setDraftFilters((previous) => ({
            ...previous,
            specialtyIds: previous.specialtyIds.includes(normalizedId)
                ? previous.specialtyIds.filter((item) => item !== normalizedId)
                : [...previous.specialtyIds, normalizedId],
        }));
    };

    const handleApplyFilters = (event) => {
        event.preventDefault();
        setAppliedFilters(draftFilters);
        setCurrentPage(1);
    };

    const handleResetFilters = () => {
        setDraftFilters(DEFAULT_FILTERS);
        setAppliedFilters(DEFAULT_FILTERS);
        setCurrentPage(1);
    };

    return (
        <div className="min-h-screen bg-[#f3f6fb] text-slate-900">
            <PatientPortalHeader
                user={user}
                activeItem="doctors"
                onHome={() => navigateToDashboardTarget(PATIENT_PORTAL_ROUTE_TARGETS.DASHBOARD)}
                onFindDoctors={() => navigate('/patient/doctors', { state: null })}
                onClinics={() => navigate('/patient/clinics')}
                onAiSupport={() => navigate('/patient/ai')}
                onAppointments={() => navigateToDashboardTarget(PATIENT_PORTAL_ROUTE_TARGETS.APPOINTMENTS)}
                onLogout={handleLogout}
            />

            <main className="mx-auto w-full max-w-[1240px] px-4 py-8 sm:px-8 sm:py-10">
                {directoryNotice && (
                    <section className="rounded-[1.5rem] border border-blue-100 bg-blue-50/80 px-5 py-4 shadow-sm">
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">{directoryNotice.title}</p>
                        <p className="mt-2 text-sm leading-7 text-slate-600">{directoryNotice.description}</p>
                    </section>
                )}

                <div className={`flex flex-col gap-8 lg:flex-row ${directoryNotice ? 'mt-6' : ''}`}>
                    <aside className="w-full shrink-0 lg:sticky lg:top-24 lg:w-[340px] lg:self-start">
                        <form onSubmit={handleApplyFilters} className="rounded-[2rem] border border-white/70 bg-white p-6 shadow-[0_22px_56px_-42px_rgba(15,23,42,0.32)]">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Advanced Filters</p>
                                    <h2 className="mt-2 text-xl font-black text-slate-900">Narrow the shortlist</h2>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleResetFilters}
                                    className="rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-slate-500 hover:bg-slate-200"
                                >
                                    Clear All
                                </button>
                            </div>

                            <div className="mt-8 space-y-7">
                                <div>
                                    <label htmlFor="doctor-search" className="block text-sm font-black text-slate-900">
                                        Doctor Name
                                    </label>
                                    <div className="relative mt-3">
                                        <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-slate-400">
                                            person_search
                                        </span>
                                        <input
                                            id="doctor-search"
                                            type="search"
                                            value={draftFilters.search}
                                            onChange={(event) => setDraftFilters((previous) => ({ ...previous, search: event.target.value }))}
                                            placeholder="Search by doctor, clinic, or specialty"
                                            className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-700 outline-none transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-blue-100"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <p className="text-sm font-black text-slate-900">Specialty</p>
                                    <div className="mt-3 max-h-48 space-y-2 overflow-y-auto pr-1">
                                        {specialties.length > 0 ? (
                                            [...specialties]
                                                .sort((left, right) => String(left.name || '').localeCompare(String(right.name || '')))
                                                .map((specialty) => {
                                                    const specialtyId = normalizeId(specialty.id);
                                                    const checked = draftFilters.specialtyIds.includes(specialtyId);

                                                    return (
                                                        <label
                                                            key={specialty.id}
                                                            className={`flex cursor-pointer items-center justify-between gap-3 rounded-2xl border px-4 py-3 transition ${checked ? 'border-primary bg-blue-50' : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white'}`}
                                                        >
                                                            <span className="flex items-center gap-3">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={checked}
                                                                    onChange={() => toggleDraftSpecialty(specialty.id)}
                                                                    className="rounded border-slate-300 text-primary focus:ring-primary"
                                                                />
                                                                <span className="text-sm font-semibold text-slate-700">{specialty.name}</span>
                                                            </span>
                                                            <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                                                                {doctorProfiles.filter((profile) => profile.specialtyIds.includes(specialtyId)).length}
                                                            </span>
                                                        </label>
                                                    );
                                                })
                                        ) : (
                                            <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                                                Specialty data is loading.
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="sort-order" className="block text-sm font-black text-slate-900">
                                        Sort Order
                                    </label>
                                    <select
                                        id="sort-order"
                                        value={draftFilters.sort}
                                        onChange={(event) => setDraftFilters((previous) => ({ ...previous, sort: event.target.value }))}
                                        className="mt-3 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-blue-100"
                                    >
                                        {Object.entries(SORT_LABELS).map(([value, label]) => (
                                            <option key={value} value={value}>{label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label htmlFor="doctor-location" className="block text-sm font-black text-slate-900">
                                        Location
                                    </label>
                                    <div className="relative mt-3">
                                        <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-slate-400">
                                            location_on
                                        </span>
                                        <input
                                            id="doctor-location"
                                            type="text"
                                            value={draftFilters.location}
                                            onChange={(event) => setDraftFilters((previous) => ({ ...previous, location: event.target.value }))}
                                            placeholder="London, Manchester..."
                                            className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-700 outline-none transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-blue-100"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="doctor-clinic" className="block text-sm font-black text-slate-900">
                                        Clinic
                                    </label>
                                    <select
                                        id="doctor-clinic"
                                        value={draftFilters.clinicId}
                                        onChange={(event) => setDraftFilters((previous) => ({ ...previous, clinicId: event.target.value }))}
                                        className="mt-3 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-blue-100"
                                    >
                                        <option value="">Any clinic</option>
                                        {[...clinics]
                                            .sort((left, right) => String(left.name || '').localeCompare(String(right.name || '')))
                                            .map((clinic) => (
                                                <option key={clinic.id} value={clinic.id}>{clinic.name}</option>
                                            ))}
                                    </select>
                                </div>

                                <div>
                                    <p className="text-sm font-black text-slate-900">Gender</p>
                                    <div className="mt-3 grid grid-cols-3 gap-2">
                                        {[
                                            { value: 'all', label: 'Any' },
                                            { value: 'M', label: 'Male' },
                                            { value: 'F', label: 'Female' },
                                        ].map((option) => {
                                            const active = draftFilters.gender === option.value;
                                            return (
                                                <button
                                                    key={option.value}
                                                    type="button"
                                                    onClick={() => setDraftFilters((previous) => ({ ...previous, gender: option.value }))}
                                                    className={`rounded-2xl px-3 py-2 text-xs font-black transition ${active ? 'bg-primary text-white shadow-[0_14px_26px_-22px_rgba(19,127,236,0.95)]' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                                >
                                                    {option.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    className="w-full rounded-2xl bg-primary px-5 py-4 text-sm font-black text-white shadow-[0_20px_36px_-24px_rgba(19,127,236,0.95)] hover:bg-primary/90"
                                >
                                    Apply Filters
                                </button>
                            </div>
                        </form>
                    </aside>

                    <section className="min-w-0 flex-1">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                            <div>
                                <h2 className="text-3xl font-black tracking-tight text-slate-900">Expert Practitioners</h2>
                                <p className="mt-2 text-sm font-semibold text-slate-500">
                                    {filteredDoctors.length} verified specialist(s) available across {filteredSpecialtyCount} specialty area(s)
                                </p>
                            </div>
                            <div className="inline-flex rounded-full border border-white/80 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-slate-500 shadow-sm">
                                Sort by: {SORT_LABELS[appliedFilters.sort]}
                            </div>
                        </div>

                        {activeFilterChips.length > 0 && (
                            <div className="mt-4 flex flex-wrap gap-2">
                                {activeFilterChips.map((chip) => (
                                    <span
                                        key={chip}
                                        className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm"
                                    >
                                        {chip}
                                    </span>
                                ))}
                            </div>
                        )}

                        {pageError && (
                            <div className="mt-6 rounded-[1.5rem] border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
                                {pageError}
                            </div>
                        )}

                        {loading ? (
                            <div className="mt-6 rounded-[2rem] border border-white/70 bg-white px-6 py-16 text-center text-sm text-slate-500 shadow-sm">
                                Loading doctor directory...
                            </div>
                        ) : filteredDoctors.length === 0 ? (
                            <div className="mt-6 rounded-[2rem] border border-white/70 bg-white px-6 py-16 text-center shadow-sm">
                                <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-slate-100 text-slate-400">
                                    <span className="material-symbols-outlined text-3xl">search_off</span>
                                </div>
                                <h3 className="mt-5 text-2xl font-black text-slate-900">No doctors match these filters</h3>
                                <p className="mt-3 text-sm leading-7 text-slate-500">
                                    Try widening the location, clearing the specialty filter, or changing the clinic selection.
                                </p>
                                <button
                                    type="button"
                                    onClick={handleResetFilters}
                                    className="mt-6 rounded-xl bg-primary px-5 py-3 text-sm font-black text-white hover:bg-primary/90"
                                >
                                    Reset Filters
                                </button>
                            </div>
                        ) : (
                            <>
                                {pagedDoctors.length > 0 && (
                                    <div className="mt-6 grid gap-5 md:grid-cols-2">
                                        {pagedDoctors.map((profile) => (
                                            <article
                                                key={profile.id}
                                                className="rounded-[1.8rem] border border-white/70 bg-white p-5 shadow-[0_20px_52px_-42px_rgba(15,23,42,0.32)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_56px_-38px_rgba(15,23,42,0.36)]"
                                            >
                                                <div className="flex gap-4">
                                                    <div className="h-24 w-24 shrink-0 overflow-hidden rounded-[1.3rem] bg-[linear-gradient(135deg,_#dbeafe,_#eff6ff_58%,_#ffffff)] shadow-md">
                                                        {profile.imageSrc ? (
                                                            <img src={profile.imageSrc} alt={profile.doctor.name} className="h-full w-full object-cover object-top" />
                                                        ) : (
                                                            <div className="grid h-full w-full place-items-center text-primary/50">
                                                                <span className="material-symbols-outlined text-5xl">person</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="min-w-0">
                                                                <h3 className="truncate text-xl font-black text-slate-900">{profile.doctor.name}</h3>
                                                                <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-primary">
                                                                    {profile.primarySpecialtyName}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div className="mt-4 space-y-2 text-sm text-slate-500">
                                                            <p className="flex items-start gap-2">
                                                                <span className="material-symbols-outlined text-[17px] text-primary">location_on</span>
                                                                <span>{profile.primaryClinicName}</span>
                                                            </p>
                                                            <p className="flex items-start gap-2">
                                                                <span className="material-symbols-outlined text-[17px] text-primary">payments</span>
                                                                <span>{profile.priceLabel}</span>
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <p className="mt-5 text-sm leading-7 text-slate-600">{truncateText(profile.summary, 125)}</p>

                                                <div className="mt-5 flex flex-wrap gap-2">
                                                    <span className="rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-bold text-slate-600">
                                                        {profile.positionLabel}
                                                    </span>
                                                    {profile.specialtyNames.slice(0, 2).map((item) => (
                                                        <span key={`${profile.id}-${item}`} className="rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-bold text-slate-600">
                                                            {item}
                                                        </span>
                                                    ))}
                                                </div>

                                                <div className="mt-6 grid grid-cols-2 gap-3">
                                                    <Link
                                                        to={`/patient/doctor/${profile.id}`}
                                                        className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-slate-700 hover:bg-slate-50"
                                                    >
                                                        View Profile
                                                    </Link>
                                                    <Link
                                                        to={`/patient/doctor/${profile.id}`}
                                                        className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-white hover:bg-slate-800"
                                                    >
                                                        Book Now
                                                    </Link>
                                                </div>
                                            </article>
                                        ))}
                                    </div>
                                )}

                                {filteredDoctors.length > PAGE_SIZE && (
                                    <div className="mt-8 flex items-center justify-center gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setCurrentPage((previous) => Math.max(1, previous - 1))}
                                            disabled={currentPage === 1}
                                            className="grid h-12 w-12 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
                                        >
                                            <span className="material-symbols-outlined">chevron_left</span>
                                        </button>

                                        <div className="flex flex-wrap items-center justify-center gap-2">
                                            {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => {
                                                const active = currentPage === pageNumber;
                                                return (
                                                    <button
                                                        key={pageNumber}
                                                        type="button"
                                                        onClick={() => setCurrentPage(pageNumber)}
                                                        className={`h-12 min-w-12 rounded-2xl px-4 text-sm font-black transition ${active ? 'bg-primary text-white shadow-[0_16px_28px_-20px_rgba(19,127,236,0.92)]' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
                                                    >
                                                        {pageNumber}
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => setCurrentPage((previous) => Math.min(totalPages, previous + 1))}
                                            disabled={currentPage === totalPages}
                                            className="grid h-12 w-12 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
                                        >
                                            <span className="material-symbols-outlined">chevron_right</span>
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </section>
                </div>
            </main>

            <section className="w-full bg-white">
                <PatientPortalFooter />
            </section>
        </div>
    );
};

export default PatientDoctorDirectory;
