import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchClinics } from '../store/slices/clinicSlice';
import { fetchDoctors } from '../store/slices/doctorSlice';
import { getApiAssetBase } from '../utils/apiClient';

const normalizeId = (value) => (value == null ? '' : String(value));

const normalizeSearchText = (value) =>
    String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();

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

const truncateText = (text, maxLength = 140) => {
    const value = String(text || '').trim();
    if (!value) return '';
    if (value.length <= maxLength) return value;
    return `${value.slice(0, maxLength - 1).trimEnd()}...`;
};

const ClinicDirectory = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { user } = useSelector((state) => state.auth);
    const { clinics, loading: clinicsLoading, error: clinicsError } = useSelector((state) => state.clinic);
    const { doctors, loading: doctorsLoading, error: doctorsError } = useSelector((state) => state.doctor);

    const [search, setSearch] = React.useState('');
    const apiAssetBase = React.useMemo(() => getApiAssetBase(), []);

    React.useEffect(() => {
        if (!clinicsLoading && clinics.length === 0) {
            dispatch(fetchClinics());
        }
        if (!doctorsLoading && doctors.length === 0) {
            dispatch(fetchDoctors());
        }
    }, [dispatch, clinics.length, clinicsLoading, doctors.length, doctorsLoading]);

    const clinicMeta = React.useMemo(() => {
        const meta = new Map();

        for (const clinic of clinics) {
            meta.set(normalizeId(clinic.id), {
                doctorIds: new Set(),
                specialties: new Map(),
            });
        }

        for (const doctor of doctors) {
            for (const relation of getDoctorRelations(doctor)) {
                const clinicId = normalizeId(relation.clinicId || relation.clinic?.id);
                if (!clinicId) continue;

                if (!meta.has(clinicId)) {
                    meta.set(clinicId, {
                        doctorIds: new Set(),
                        specialties: new Map(),
                    });
                }

                const item = meta.get(clinicId);
                item.doctorIds.add(normalizeId(doctor.id));

                const specialty = relation.specialty;
                const specialtyId = normalizeId(relation.specialtyId || specialty?.id);
                if (specialtyId && specialty) {
                    item.specialties.set(specialtyId, specialty);
                }
            }
        }

        return meta;
    }, [clinics, doctors]);

    const totalSpecialties = React.useMemo(() => {
        const specialtyIds = new Set();
        for (const item of clinicMeta.values()) {
            for (const specialtyId of item.specialties.keys()) {
                specialtyIds.add(specialtyId);
            }
        }
        return specialtyIds.size;
    }, [clinicMeta]);

    const orderedClinics = React.useMemo(() => {
        const items = [...clinics];
        return items.sort((left, right) => {
            const leftMeta = clinicMeta.get(normalizeId(left.id));
            const rightMeta = clinicMeta.get(normalizeId(right.id));
            const doctorDelta = (rightMeta?.doctorIds.size || 0) - (leftMeta?.doctorIds.size || 0);
            if (doctorDelta !== 0) return doctorDelta;
            return String(left.name || '').localeCompare(String(right.name || ''));
        });
    }, [clinicMeta, clinics]);

    const filteredClinics = React.useMemo(() => {
        const keyword = normalizeSearchText(search).trim();
        if (!keyword) return orderedClinics;

        return orderedClinics.filter((clinic) => {
            const meta = clinicMeta.get(normalizeId(clinic.id));
            const specialties = [...(meta?.specialties.values() || [])].map((specialty) => specialty?.name).join(' ');
            const haystack = normalizeSearchText([clinic.name, clinic.address, clinic.description, specialties].filter(Boolean).join(' '));
            return haystack.includes(keyword);
        });
    }, [clinicMeta, orderedClinics, search]);

    const featuredClinic = filteredClinics[0] || orderedClinics[0] || null;
    const featuredClinicMeta = featuredClinic ? clinicMeta.get(normalizeId(featuredClinic.id)) : null;
    const featuredClinicImage = resolveImageSource(featuredClinic?.image, apiAssetBase);
    const loading = clinicsLoading || doctorsLoading;
    const error = clinicsError || doctorsError;

    return (
        <div className="min-h-screen bg-slate-100 text-slate-900">
            <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
                <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-8 lg:px-10">
                    <Link to="/patient" className="flex items-center gap-3">
                        <div className="grid size-10 place-items-center rounded-xl bg-primary text-white shadow-lg shadow-blue-200/70">
                            <span className="material-symbols-outlined text-[20px]">health_and_safety</span>
                        </div>
                        <div>
                            <p className="text-lg font-black tracking-tight">HealthSync</p>
                            <p className="text-xs text-slate-500">Patient Portal</p>
                        </div>
                    </Link>

                    <nav className="hidden items-center gap-2 md:flex">
                        <button
                            type="button"
                            onClick={() => navigate('/patient')}
                            className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                        >
                            Dashboard
                        </button>
                        <div className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-black text-primary">Clinics</div>
                    </nav>

                    <div className="flex items-center gap-3">
                        <div className="hidden items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 sm:flex">
                            <div className="grid size-9 place-items-center rounded-full bg-slate-900 text-xs font-black text-white">
                                {extractInitials(user?.name)}
                            </div>
                            <span className="max-w-[180px] truncate text-sm font-semibold text-slate-700">{user?.name}</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => navigate('/patient')}
                            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                        >
                            Back to Dashboard
                        </button>
                    </div>
                </div>
            </header>

            <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-8 lg:px-10">
                <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                    <Link to="/patient" className="font-medium hover:text-primary">Home</Link>
                    <span className="material-symbols-outlined text-base text-slate-300">chevron_right</span>
                    <span className="font-semibold text-slate-900">Clinics</span>
                </nav>

                <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
                    <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
                        <div className="p-6 sm:p-8 lg:p-10">
                            <div className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-primary">
                                Clinic Directory
                            </div>
                            <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
                                Explore clinics available in HealthSync
                            </h1>
                            <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
                                Browse current clinics, review addresses and specialties, then open a clinic page to see the doctors currently linked to it.
                            </p>

                            <div className="mt-8 grid gap-4 sm:grid-cols-3">
                                <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Clinics</p>
                                    <p className="mt-3 text-3xl font-black text-slate-900">{clinics.length}</p>
                                    <p className="mt-2 text-sm text-slate-500">Currently visible in the patient catalog.</p>
                                </article>
                                <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Doctors</p>
                                    <p className="mt-3 text-3xl font-black text-slate-900">{doctors.length}</p>
                                    <p className="mt-2 text-sm text-slate-500">Doctors linked to clinics and ready to browse.</p>
                                </article>
                                <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Specialties</p>
                                    <p className="mt-3 text-3xl font-black text-slate-900">{totalSpecialties}</p>
                                    <p className="mt-2 text-sm text-slate-500">Distinct specialty areas represented across clinics.</p>
                                </article>
                            </div>

                            <div className="mt-8 flex flex-wrap gap-3">
                                <Link
                                    to="/patient"
                                    className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
                                >
                                    Back to Dashboard
                                </Link>
                            </div>
                        </div>

                        <div className="relative min-h-[340px] border-t border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.16),_transparent_34%),linear-gradient(135deg,_#eff6ff,_#f8fafc_58%,_#ffffff)] lg:min-h-full lg:border-l lg:border-t-0">
                            {featuredClinic ? (
                                <div className="flex h-full flex-col p-6 sm:p-8">
                                    <div className="overflow-hidden rounded-[1.75rem] border border-white/70 bg-white shadow-lg shadow-blue-100/50">
                                        {featuredClinicImage ? (
                                            <img
                                                src={featuredClinicImage}
                                                alt={featuredClinic.name}
                                                className="h-56 w-full object-cover sm:h-72"
                                            />
                                        ) : (
                                            <div className="grid h-56 w-full place-items-center bg-slate-100 sm:h-72">
                                                <span className="material-symbols-outlined text-7xl text-slate-400">apartment</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-5 rounded-[1.75rem] border border-white/80 bg-white/90 p-5 shadow-sm">
                                        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Featured Clinic</p>
                                        <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-900">{featuredClinic.name}</h2>
                                        <p className="mt-2 flex items-start gap-2 text-sm text-slate-500">
                                            <span className="material-symbols-outlined text-[18px] text-primary">location_on</span>
                                            <span>{featuredClinic.address || 'Address currently unavailable'}</span>
                                        </p>
                                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                            <div className="rounded-2xl bg-slate-50 px-4 py-3">
                                                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Doctors</p>
                                                <p className="mt-2 text-2xl font-black text-slate-900">
                                                    {featuredClinicMeta?.doctorIds.size || 0}
                                                </p>
                                            </div>
                                            <div className="rounded-2xl bg-slate-50 px-4 py-3">
                                                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Specialties</p>
                                                <p className="mt-2 text-2xl font-black text-slate-900">
                                                    {featuredClinicMeta?.specialties.size || 0}
                                                </p>
                                            </div>
                                        </div>
                                        <Link
                                            to={`/patient/clinics/${featuredClinic.id}`}
                                            className="mt-5 inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-black text-white hover:bg-primary/90"
                                        >
                                            Open Clinic Page
                                        </Link>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid h-full min-h-[340px] place-items-center p-8 text-center text-slate-500">
                                    Clinic data will appear here once available.
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                <section className="mt-8 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <h2 className="text-2xl font-black tracking-tight text-slate-900">All Clinics</h2>
                            <p className="mt-1 text-sm text-slate-500">Search by clinic name, address, or specialty.</p>
                        </div>
                        <div className="relative w-full max-w-xl">
                            <span className="material-symbols-outlined pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[18px] text-slate-400">search</span>
                            <input
                                type="search"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Search clinics, city, or specialty"
                                className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-700 outline-none transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-blue-100"
                            />
                        </div>
                    </div>
                </section>

                <section className="mt-8 space-y-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-slate-500">{filteredClinics.length} clinic(s) found</p>
                        {error && <p className="text-sm font-medium text-red-700">{error}</p>}
                    </div>

                    {loading ? (
                        <div className="rounded-[2rem] border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">
                            Loading clinics...
                        </div>
                    ) : filteredClinics.length === 0 ? (
                        <div className="rounded-[2rem] border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">
                            No clinics match your search right now.
                        </div>
                    ) : (
                        <div className="grid gap-5 lg:grid-cols-2">
                            {filteredClinics.map((clinic) => {
                                const meta = clinicMeta.get(normalizeId(clinic.id));
                                const specialties = [...(meta?.specialties.values() || [])].sort((left, right) =>
                                    String(left?.name || '').localeCompare(String(right?.name || ''))
                                );
                                const imageSrc = resolveImageSource(clinic.image, apiAssetBase);

                                return (
                                    <article
                                        key={clinic.id}
                                        className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-md"
                                    >
                                        <div className="grid gap-0 md:grid-cols-[0.9fr_1.1fr]">
                                            <div className="min-h-[240px] border-b border-slate-200 bg-slate-100 md:border-b-0 md:border-r">
                                                {imageSrc ? (
                                                    <img src={imageSrc} alt={clinic.name} className="h-full w-full object-cover" />
                                                ) : (
                                                    <div className="grid h-full w-full place-items-center bg-[linear-gradient(135deg,_#dbeafe,_#eff6ff_55%,_#f8fafc)]">
                                                        <span className="material-symbols-outlined text-7xl text-primary/50">apartment</span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex flex-col justify-between p-5 sm:p-6">
                                                <div>
                                                    <div className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-primary">
                                                        Clinic
                                                    </div>
                                                    <h3 className="mt-4 text-2xl font-black tracking-tight text-slate-900">{clinic.name}</h3>
                                                    <p className="mt-3 flex items-start gap-2 text-sm text-slate-500">
                                                        <span className="material-symbols-outlined text-[18px] text-primary">location_on</span>
                                                        <span>{clinic.address || 'Address currently unavailable'}</span>
                                                    </p>
                                                    <p className="mt-4 text-sm leading-7 text-slate-600">
                                                        {truncateText(clinic.description, 165) || 'Clinic description is being updated.'}
                                                    </p>

                                                    <div className="mt-5 flex flex-wrap gap-2">
                                                        {specialties.length > 0 ? (
                                                            specialties.slice(0, 4).map((specialty) => (
                                                                <span
                                                                    key={specialty.id}
                                                                    className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600"
                                                                >
                                                                    {specialty.name}
                                                                </span>
                                                            ))
                                                        ) : (
                                                            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-500">
                                                                Specialty information unavailable
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
                                                    <div className="flex gap-5">
                                                        <div>
                                                            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Doctors</p>
                                                            <p className="mt-1 text-lg font-black text-slate-900">{meta?.doctorIds.size || 0}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Specialties</p>
                                                            <p className="mt-1 text-lg font-black text-slate-900">{meta?.specialties.size || 0}</p>
                                                        </div>
                                                    </div>

                                                    <Link
                                                        to={`/patient/clinics/${clinic.id}`}
                                                        className="inline-flex rounded-xl bg-primary px-4 py-3 text-sm font-black text-white hover:bg-primary/90"
                                                    >
                                                        View Clinic
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
        </div>
    );
};

export default ClinicDirectory;
