import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logoutUser } from '../store/slices/authSlice';
import { resetAiSession } from '../store/slices/aiSlice';
import { fetchClinics } from '../store/slices/clinicSlice';
import { fetchDoctors } from '../store/slices/doctorSlice';
import { getApiAssetBase } from '../utils/apiClient';
import PatientPortalFooter from '../components/layout/PatientPortalFooter';
import PatientPortalHeader from '../components/layout/PatientPortalHeader';
import { PATIENT_PORTAL_ROUTE_TARGETS } from '../components/layout/patientPortalConfig';

const normalizeId = (value) => (value == null ? '' : String(value));

const normalizeSearchText = (value) =>
    String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();

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

    const loading = clinicsLoading || doctorsLoading;
    const error = clinicsError || doctorsError;
    const navigateToDashboardTarget = (portalTarget) => {
        navigate('/patient', { state: { portalTarget } });
    };

    const handleLogout = async () => {
        dispatch(resetAiSession());
        await dispatch(logoutUser());
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-slate-100 text-slate-900">
            <PatientPortalHeader
                user={user}
                activeItem="clinics"
                onHome={() => navigateToDashboardTarget(PATIENT_PORTAL_ROUTE_TARGETS.DASHBOARD)}
                onFindDoctors={() => navigate('/patient/doctors')}
                onClinics={() => navigate('/patient/clinics')}
                onAiSupport={() => navigate('/patient/ai')}
                onAppointments={() => navigateToDashboardTarget(PATIENT_PORTAL_ROUTE_TARGETS.APPOINTMENTS)}
                onLogout={handleLogout}
            />

            <main className="mx-auto w-full max-w-[1240px] px-4 py-8 sm:px-8 sm:py-10">
                <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                    <Link to="/patient" className="font-medium hover:text-primary">Home</Link>
                    <span className="material-symbols-outlined text-base text-slate-300">chevron_right</span>
                    <span className="font-semibold text-slate-900">Clinics</span>
                </nav>

                <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
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

            <section className="w-full bg-white">
                <PatientPortalFooter />
            </section>
        </div>
    );
};

export default ClinicDirectory;
