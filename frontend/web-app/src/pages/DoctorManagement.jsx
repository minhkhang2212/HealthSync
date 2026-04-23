import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchClinics } from '../store/slices/clinicSlice';
import { clearDoctorError, fetchDoctors } from '../store/slices/doctorSlice';
import { fetchSpecialties } from '../store/slices/specialtySlice';
import apiClient from '../utils/apiClient';
import NewDoctorModal from '../components/admin/NewDoctorModal';
import AdminShell from '../components/layout/AdminShell';
import {
    buildDoctorAdminRows,
    filterDoctorAdminRows,
    sortByNewestCreated,
} from '../utils/adminManagement';

const formatCreatedLabel = (value, fallbackId) => {
    const parsed = new Date(value || '');
    if (Number.isNaN(parsed.getTime())) {
        return `ID #${fallbackId}`;
    }

    return parsed.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const DoctorManagement = () => {
    const dispatch = useDispatch();
    const { clinics, loading: clinicsLoading } = useSelector((state) => state.clinic);
    const { specialties, loading: specialtiesLoading } = useSelector((state) => state.specialty);
    const { doctors, loading: doctorsLoading, error: doctorError } = useSelector((state) => state.doctor);

    const [search, setSearch] = useState('');
    const [filters, setFilters] = useState({
        clinicId: 'all',
        specialtyId: 'all',
        status: 'all',
    });
    const [isNewDoctorOpen, setIsNewDoctorOpen] = useState(false);
    const [isEditDoctorOpen, setIsEditDoctorOpen] = useState(false);
    const [selectedDoctor, setSelectedDoctor] = useState(null);
    const [doctorActionId, setDoctorActionId] = useState(null);
    const [pageError, setPageError] = useState('');
    const [notice, setNotice] = useState('');

    useEffect(() => {
        if (clinics.length === 0) {
            dispatch(fetchClinics());
        }
        if (specialties.length === 0) {
            dispatch(fetchSpecialties());
        }
        if (!doctorsLoading && doctors.length === 0) {
            dispatch(fetchDoctors({ admin: true }));
        }
    }, [dispatch, clinics.length, specialties.length, doctorsLoading, doctors.length]);

    useEffect(() => {
        if (!notice) {
            return undefined;
        }

        const timer = window.setTimeout(() => setNotice(''), 4000);
        return () => window.clearTimeout(timer);
    }, [notice]);

    const clinicNames = useMemo(
        () => Object.fromEntries(clinics.map((clinic) => [String(clinic.id), clinic.name])),
        [clinics]
    );
    const specialtyNames = useMemo(
        () => Object.fromEntries(specialties.map((specialty) => [String(specialty.id), specialty.name])),
        [specialties]
    );

    const doctorRows = useMemo(
        () => sortByNewestCreated(buildDoctorAdminRows(doctors, clinicNames, specialtyNames)),
        [doctors, clinicNames, specialtyNames]
    );

    const filteredDoctors = useMemo(
        () => filterDoctorAdminRows(doctorRows, {
            search,
            clinicId: filters.clinicId,
            specialtyId: filters.specialtyId,
            status: filters.status,
        }),
        [doctorRows, search, filters]
    );

    const handleDoctorCreated = useCallback((doctor) => {
        const doctorName = doctor?.name ? `"${doctor.name}"` : 'account';
        setNotice(`Doctor ${doctorName} created successfully.`);
        setPageError('');
        dispatch(fetchDoctors({ admin: true }));
    }, [dispatch]);

    const handleDoctorUpdated = useCallback((doctor) => {
        const doctorName = doctor?.name ? `"${doctor.name}"` : 'profile';
        setNotice(`Doctor ${doctorName} updated successfully.`);
        setPageError('');
        dispatch(fetchDoctors({ admin: true }));
    }, [dispatch]);

    const handleOpenEditDoctor = useCallback((doctor) => {
        setSelectedDoctor(doctor);
        setIsEditDoctorOpen(true);
    }, []);

    const handleToggleDoctorActive = useCallback(async (doctor) => {
        const nextValue = !doctor.isActive;
        if (!nextValue && !window.confirm(`Set doctor "${doctor.name}" as inactive? This doctor will be hidden from Patient Dashboard.`)) {
            return;
        }

        setDoctorActionId(doctor.id);
        setPageError('');

        try {
            await apiClient.patch(`/admin/doctors/${doctor.id}`, { isActive: nextValue });
            setNotice(`Doctor "${doctor.name}" is now ${nextValue ? 'active' : 'inactive'}.`);
            dispatch(fetchDoctors({ admin: true }));
        } catch (error) {
            setPageError(error.response?.data?.message || 'Failed to update doctor status.');
        } finally {
            setDoctorActionId(null);
        }
    }, [dispatch]);

    const handleDismissError = () => {
        setPageError('');
        dispatch(clearDoctorError());
    };

    const showingText = filteredDoctors.length === doctorRows.length
        ? `Showing all ${doctorRows.length} doctors.`
        : `Showing ${filteredDoctors.length} of ${doctorRows.length} doctors.`;

    return (
        <AdminShell>
            {(doctorError || pageError) && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <span className="material-symbols-outlined text-base">error</span>
                    <span>{pageError || doctorError}</span>
                    <button
                        type="button"
                        onClick={handleDismissError}
                        className="ml-auto text-red-500 hover:text-red-700"
                    >
                        <span className="material-symbols-outlined text-base">close</span>
                    </button>
                </div>
            )}

            {notice && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {notice}
                </div>
            )}

            <section className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-3xl font-black tracking-tight">Doctors</h1>
                    <p className="mt-1 text-sm text-slate-500">Full doctor directory with client-side search, filters, and newest-first sorting.</p>
                </div>
                <button
                    type="button"
                    onClick={() => setIsNewDoctorOpen(true)}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white"
                >
                    New Doctor
                </button>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
                    <label className="space-y-2 text-sm font-semibold text-slate-700 md:col-span-2">
                        <span>Search</span>
                        <div className="flex h-11 items-center rounded-lg border border-slate-300 bg-white text-slate-500 focus-within:border-primary">
                            <span className="material-symbols-outlined pl-3 text-[20px]">search</span>
                            <input
                                type="search"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Search doctors by name, email, clinic, specialty..."
                                className="h-full w-full bg-transparent px-2 pr-3 text-sm font-medium text-slate-700 outline-none placeholder:text-slate-400"
                            />
                        </div>
                    </label>

                    <label className="space-y-2 text-sm font-semibold text-slate-700">
                        <span>Clinic</span>
                        <select
                            value={filters.clinicId}
                            onChange={(event) => setFilters((prev) => ({ ...prev, clinicId: event.target.value }))}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-primary"
                            disabled={clinicsLoading}
                        >
                            <option value="all">All clinics</option>
                            {clinics.map((clinic) => (
                                <option key={clinic.id} value={clinic.id}>
                                    {clinic.name}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="space-y-2 text-sm font-semibold text-slate-700">
                        <span>Specialty</span>
                        <select
                            value={filters.specialtyId}
                            onChange={(event) => setFilters((prev) => ({ ...prev, specialtyId: event.target.value }))}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-primary"
                            disabled={specialtiesLoading}
                        >
                            <option value="all">All specialties</option>
                            {specialties.map((specialty) => (
                                <option key={specialty.id} value={specialty.id}>
                                    {specialty.name}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="space-y-2 text-sm font-semibold text-slate-700">
                        <span>Status</span>
                        <select
                            value={filters.status}
                            onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-primary"
                        >
                            <option value="all">All statuses</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </label>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-100 pt-3 text-sm">
                    <span className="font-semibold text-slate-700">{showingText}</span>
                    <span className="text-slate-500">Search matches doctor name, email, clinic, and specialty.</span>
                </div>
            </section>

            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[860px] text-left" data-testid="doctor-management-table">
                        <thead className="border-b border-slate-200 bg-slate-50">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Doctor</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Specialty</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Clinic</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Created</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Status</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {doctorsLoading && doctorRows.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-500">
                                        Loading doctors...
                                    </td>
                                </tr>
                            ) : filteredDoctors.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-500">
                                        No doctors match the current search or filters.
                                    </td>
                                </tr>
                            ) : filteredDoctors.map((doctor) => (
                                <tr key={doctor.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4">
                                        <p className="text-sm font-bold text-slate-900">{doctor.name}</p>
                                        <p className="mt-1 text-xs text-slate-500">{doctor.email}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-700">
                                            {doctor.specialty}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600">{doctor.clinic}</td>
                                    <td className="px-6 py-4">
                                        <p className="text-sm font-semibold text-slate-700">
                                            {formatCreatedLabel(doctor.createdAt, doctor.id)}
                                        </p>
                                        <p className="mt-1 text-xs text-slate-400">Newest doctors appear first.</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${doctor.statusClass}`}>
                                            {doctor.statusText}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                type="button"
                                                onClick={() => handleOpenEditDoctor(doctor.raw)}
                                                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:border-primary hover:text-primary"
                                            >
                                                Edit Profile
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleToggleDoctorActive(doctor.raw)}
                                                disabled={doctorActionId === doctor.id}
                                                className={`rounded-lg px-3 py-1.5 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-60 ${doctor.isActive ? 'bg-rose-100 text-rose-700 hover:bg-rose-200' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}
                                            >
                                                {doctorActionId === doctor.id ? 'Saving...' : doctor.isActive ? 'Set Inactive' : 'Activate'}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            <NewDoctorModal
                isOpen={isNewDoctorOpen}
                onClose={() => setIsNewDoctorOpen(false)}
                clinics={clinics}
                specialties={specialties}
                onCreated={handleDoctorCreated}
            />
            <NewDoctorModal
                isOpen={isEditDoctorOpen}
                onClose={() => {
                    setIsEditDoctorOpen(false);
                    setSelectedDoctor(null);
                }}
                clinics={clinics}
                specialties={specialties}
                mode="edit"
                doctor={selectedDoctor}
                onUpdated={handleDoctorUpdated}
            />
        </AdminShell>
    );
};

export default DoctorManagement;
