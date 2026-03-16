import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchDoctors, createDoctor, updateDoctor, clearDoctorError } from '../store/slices/doctorSlice';
import { fetchClinics } from '../store/slices/clinicSlice';
import { fetchSpecialties } from '../store/slices/specialtySlice';
import AdminShell from '../components/layout/AdminShell';
import { getApiAssetBase } from '../utils/apiClient';

const INITIAL_FORM = {
    name: '',
    email: '',
    password: '',
    positionId: '',
    gender: '',
    phoneNumber: '',
    image: '',
    imageFile: null,
    removeImage: false,
    isActive: true,
    priceId: '',
    provinceId: '',
    paymentId: '',
    addressClinic: '',
    nameClinic: '',
    note: '',
    clinicId: '',
    specialtyId: '',
};

const resolveImageSource = (value, apiAssetBase) => {
    if (!value || typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith('data:') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
    if (trimmed.startsWith('/')) return apiAssetBase ? `${apiAssetBase}${trimmed}` : trimmed;
    return `data:image/jpeg;base64,${trimmed}`;
};

const DoctorManagement = () => {
    const dispatch = useDispatch();
    const fileInputRef = useRef(null);

    const { doctors, loading, error } = useSelector((state) => state.doctor);
    const { clinics } = useSelector((state) => state.clinic);
    const { specialties } = useSelector((state) => state.specialty);

    const [showModal, setShowModal] = useState(false);
    const [editingDoctor, setEditingDoctor] = useState(null);
    const [formData, setFormData] = useState(INITIAL_FORM);
    const [imagePreview, setImagePreview] = useState('');
    const [localError, setLocalError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const apiAssetBase = useMemo(() => getApiAssetBase(), []);

    useEffect(() => {
        dispatch(fetchDoctors({ admin: true }));
        if (clinics.length === 0) dispatch(fetchClinics());
        if (specialties.length === 0) dispatch(fetchSpecialties());
    }, [dispatch, clinics.length, specialties.length]);

    const openCreateModal = () => {
        setEditingDoctor(null);
        setFormData(INITIAL_FORM);
        setImagePreview('');
        setLocalError('');
        setSubmitting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        setShowModal(true);
    };

    const openEditModal = (doctor) => {
        setEditingDoctor(doctor);
        const df = doctor.doctor_infor || {};
        const sc = doctor.doctor_clinic_specialties?.[0] || {};

        setFormData({
            name: doctor.name || '',
            email: doctor.email || '',
            password: '', // blank on edit
            positionId: doctor.positionId || '',
            gender: doctor.gender || '',
            phoneNumber: doctor.phoneNumber || '',
            image: doctor.image || '',
            imageFile: null,
            removeImage: false,
            isActive: doctor.isActive ?? true,
            priceId: df.priceId || '',
            provinceId: df.provinceId || '',
            paymentId: df.paymentId || '',
            addressClinic: df.addressClinic || '',
            nameClinic: df.nameClinic || '',
            note: df.note || '',
            clinicId: sc.clinicId || '',
            specialtyId: sc.specialtyId || '',
        });
        setImagePreview(resolveImageSource(doctor.image, apiAssetBase) || '');
        setLocalError('');
        setSubmitting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingDoctor(null);
        setFormData(INITIAL_FORM);
        setImagePreview('');
        setLocalError('');
        setSubmitting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleImageChange = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            setLocalError('Please choose a valid image file.');
            event.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = () => setImagePreview(String(reader.result || ''));
        reader.readAsDataURL(file);

        setFormData((prev) => ({ ...prev, imageFile: file, removeImage: false }));
        setLocalError('');
    };

    const handleRemoveImage = () => {
        setFormData((prev) => ({ ...prev, image: '', imageFile: null, removeImage: true }));
        setImagePreview('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (submitting) return;

        if (!editingDoctor && formData.password.length < 8) {
            setLocalError('Password must be at least 8 characters long for new doctors.');
            return;
        }

        setSubmitting(true);
        setLocalError('');

        const payload = { ...formData };
        if (editingDoctor && !payload.password) {
            delete payload.password;
        }

        const action = editingDoctor
            ? updateDoctor({ id: editingDoctor.id, data: payload })
            : createDoctor(payload);

        const result = await dispatch(action);

        const success = editingDoctor
            ? updateDoctor.fulfilled.match(result)
            : createDoctor.fulfilled.match(result);

        if (success) {
            closeModal();
            dispatch(fetchDoctors({ admin: true })); // refresh list
        } else {
            setSubmitting(false);
            setLocalError(result.payload || 'Failed to save doctor.');
        }
    };

    return (
        <AdminShell>
            {(error || localError) && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <span className="material-symbols-outlined text-base">error</span>
                    <span>{localError || typeof error === 'string' ? error : 'An error occurred'}</span>
                    <button
                        onClick={() => {
                            setLocalError('');
                            dispatch(clearDoctorError());
                        }}
                        className="ml-auto text-red-500 hover:text-red-700"
                    >
                        <span className="material-symbols-outlined text-base">close</span>
                    </button>
                </div>
            )}

            <section className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-3xl font-black tracking-tight">Doctor Management</h1>
                    <p className="mt-1 text-sm text-slate-500">Manage doctors profiles, clinic assignments, and specialties.</p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary/90"
                >
                    New Doctor
                </button>
            </section>

            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm mt-6">
                {loading && doctors.length === 0 ? (
                    <div className="py-16 text-center text-slate-500">Loading doctors...</div>
                ) : doctors.length === 0 ? (
                    <div className="py-16 text-center text-slate-400">No doctors found.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[900px] text-left">
                            <thead className="border-b border-slate-200 bg-slate-50">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Doctor</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Contact</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Specialty / Clinic</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Status</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-500">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {doctors.map((doctor) => {
                                    const thumbnail = resolveImageSource(doctor.image, apiAssetBase);
                                    const drSpecialties = doctor.doctor_clinic_specialties || [];
                                    const sId = drSpecialties[0]?.specialtyId;
                                    const cId = drSpecialties[0]?.clinicId;
                                    const specialty = specialties.find(s => s.id === sId)?.name || 'N/A';
                                    const clinic = clinics.find(c => c.id === cId)?.name || 'N/A';

                                    return (
                                        <tr key={doctor.id} className="hover:bg-slate-50">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    {thumbnail ? (
                                                        <img src={thumbnail} alt={doctor.name} className="h-10 w-10 rounded-full object-cover" />
                                                    ) : (
                                                        <div className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-400">
                                                            <span className="material-symbols-outlined text-[18px]">person</span>
                                                        </div>
                                                    )}
                                                    <div>
                                                        <p className="text-sm font-bold">{doctor.name}</p>
                                                        <p className="text-xs text-slate-500">{doctor.positionId ? `Pos: ${doctor.positionId}` : 'ID: ' + doctor.id}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-600">
                                                <div>{doctor.email}</div>
                                                <div className="text-slate-500 text-xs mt-0.5">{doctor.phoneNumber || 'No phone'}</div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-600">
                                                <div className="font-semibold text-slate-700">{specialty}</div>
                                                <div className="text-xs text-slate-500 mt-0.5">{clinic}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {doctor.isActive ? (
                                                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">Active</span>
                                                ) : (
                                                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">Inactive</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => openEditModal(doctor)}
                                                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-primary"
                                                    title="Edit"
                                                >
                                                    <span className="material-symbols-outlined text-[20px]">edit</span>
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {/* Doctor Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
                        <div className="flex items-center justify-between border-b border-slate-200 p-5 sticky top-0 bg-white z-10">
                            <h3 className="text-lg font-black">{editingDoctor ? 'Edit Doctor' : 'New Doctor'}</h3>
                            <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-5 space-y-6">

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Basic Info */}
                                <div>
                                    <label className="mb-1 block text-sm font-semibold text-slate-700">Doctor Name *</label>
                                    <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary" />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-semibold text-slate-700">Email (Login) {editingDoctor ? '' : '*'}</label>
                                    <input type="email" required={!editingDoctor} disabled={!!editingDoctor} value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary disabled:bg-slate-50 disabled:text-slate-500" />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-semibold text-slate-700">Phone Number</label>
                                    <input type="text" value={formData.phoneNumber} onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary" />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-semibold text-slate-700">Password {editingDoctor ? '(Leave blank to keep)' : '*'}</label>
                                    <input type="password" required={!editingDoctor} minLength={8} value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary" />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-semibold text-slate-700">Position ID (e.g., P0, P1)</label>
                                    <input type="text" value={formData.positionId} onChange={(e) => setFormData({ ...formData, positionId: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary" />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-semibold text-slate-700">Gender</label>
                                    <select value={formData.gender} onChange={(e) => setFormData({ ...formData, gender: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary">
                                        <option value="">Select Gender</option>
                                        <option value="M">Male</option>
                                        <option value="F">Female</option>
                                        <option value="O">Other</option>
                                    </select>
                                </div>

                                {/* Assignments */}
                                <div>
                                    <label className="mb-1 block text-sm font-semibold text-slate-700">Assign Clinic</label>
                                    <select value={formData.clinicId} onChange={(e) => setFormData({ ...formData, clinicId: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary">
                                        <option value="">None</option>
                                        {clinics.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-semibold text-slate-700">Assign Specialty</label>
                                    <select value={formData.specialtyId} onChange={(e) => setFormData({ ...formData, specialtyId: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary">
                                        <option value="">None</option>
                                        {specialties.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>

                                {/* Extra Information */}
                                <div>
                                    <label className="mb-1 block text-sm font-semibold text-slate-700">Price ID</label>
                                    <input type="text" value={formData.priceId} onChange={(e) => setFormData({ ...formData, priceId: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary" placeholder="PRI1" />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-semibold text-slate-700">Payment method ID</label>
                                    <input type="text" value={formData.paymentId} onChange={(e) => setFormData({ ...formData, paymentId: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary" placeholder="PAY1" />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-semibold text-slate-700">Province ID</label>
                                    <input type="text" value={formData.provinceId} onChange={(e) => setFormData({ ...formData, provinceId: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary" placeholder="PRO1" />
                                </div>

                                <div className="md:col-span-2 flex items-center gap-2 mt-2">
                                    <input type="checkbox" id="isActive" checked={formData.isActive} onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })} className="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary" />
                                    <label htmlFor="isActive" className="text-sm font-semibold text-slate-700">Doctor Account is Active</label>
                                </div>
                            </div>

                            {/* Image Upload */}
                            <div>
                                <label className="mb-1 block text-sm font-semibold text-slate-700">Doctor Photo</label>
                                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-200" />
                                {imagePreview ? (
                                    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 max-w-[200px]">
                                        <img src={imagePreview} alt="Doctor preview" className="w-full h-auto rounded-md object-cover" />
                                        {(formData.imageFile || imagePreview) && (
                                            <button type="button" onClick={handleRemoveImage} className="mt-2 text-xs font-semibold text-red-600 hover:text-red-700">Remove image</button>
                                        )}
                                    </div>
                                ) : <p className="mt-2 text-xs text-slate-500">No image selected.</p>}
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 bg-white sticky bottom-0 -mx-5 px-5 pb-5">
                                <button type="button" onClick={closeModal} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600">Cancel</button>
                                <button type="submit" disabled={submitting} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-60">
                                    {submitting ? 'Saving...' : editingDoctor ? 'Save Changes' : 'Create Doctor'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminShell>
    );
};

export default DoctorManagement;
