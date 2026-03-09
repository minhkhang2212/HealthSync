import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    fetchSpecialties,
    createSpecialty,
    updateSpecialty,
    deleteSpecialty,
    clearError,
} from '../store/slices/specialtySlice';
import AdminShell from '../components/layout/AdminShell';
import { getApiAssetBase } from '../utils/apiClient';

const INITIAL_FORM = {
    name: '',
    description: '',
    image: '',
    imageFile: null,
    removeImage: false,
};

const resolveImageSource = (value, apiAssetBase) => {
    if (!value || typeof value !== 'string') return null;

    const trimmed = value.trim();
    if (!trimmed) return null;

    if (trimmed.startsWith('data:') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        return trimmed;
    }

    if (trimmed.startsWith('/')) {
        return apiAssetBase ? `${apiAssetBase}${trimmed}` : trimmed;
    }

    return `data:image/jpeg;base64,${trimmed}`;
};

const SpecialtyManagement = () => {
    const dispatch = useDispatch();
    const fileInputRef = useRef(null);
    const { specialties, loading, error } = useSelector((state) => state.specialty);

    const [showModal, setShowModal] = useState(false);
    const [editingSpecialty, setEditingSpecialty] = useState(null);
    const [formData, setFormData] = useState(INITIAL_FORM);
    const [imagePreview, setImagePreview] = useState('');
    const [localError, setLocalError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const apiAssetBase = useMemo(() => getApiAssetBase(), []);

    useEffect(() => {
        if (specialties.length === 0) {
            dispatch(fetchSpecialties());
        }
    }, [dispatch, specialties.length]);

    const openCreateModal = () => {
        setEditingSpecialty(null);
        setFormData(INITIAL_FORM);
        setImagePreview('');
        setLocalError('');
        setSubmitting(false);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        setShowModal(true);
    };

    const openEditModal = (specialty) => {
        setEditingSpecialty(specialty);
        setFormData({
            name: specialty.name || '',
            description: specialty.description || '',
            image: specialty.image || '',
            imageFile: null,
            removeImage: false,
        });
        setImagePreview(resolveImageSource(specialty.image, apiAssetBase) || '');
        setLocalError('');
        setSubmitting(false);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingSpecialty(null);
        setFormData(INITIAL_FORM);
        setImagePreview('');
        setLocalError('');
        setSubmitting(false);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
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

        setFormData((prev) => ({
            ...prev,
            imageFile: file,
            removeImage: false,
        }));
        setLocalError('');
    };

    const handleRemoveImage = () => {
        setFormData((prev) => ({
            ...prev,
            image: '',
            imageFile: null,
            removeImage: true,
        }));
        setImagePreview('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (submitting) return;

        const normalizedName = formData.name.trim().toLowerCase();
        const duplicate = specialties.find((item) => {
            if (editingSpecialty && item.id === editingSpecialty.id) return false;
            return (item.name || '').trim().toLowerCase() === normalizedName;
        });

        if (duplicate) {
            setLocalError('Specialty name already exists. Please choose another name.');
            return;
        }

        setSubmitting(true);
        setLocalError('');

        const payload = {
            name: formData.name.trim(),
            description: formData.description.trim(),
            image: formData.image,
            imageFile: formData.imageFile,
            removeImage: formData.removeImage,
        };

        const action = editingSpecialty
            ? updateSpecialty({ id: editingSpecialty.id, data: payload })
            : createSpecialty(payload);
        const result = await dispatch(action);

        const success = editingSpecialty
            ? updateSpecialty.fulfilled.match(result)
            : createSpecialty.fulfilled.match(result);

        if (success) {
            closeModal();
        } else {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this specialty?')) {
            dispatch(deleteSpecialty(id));
        }
    };

    return (
        <AdminShell>
            {(error || localError) && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <span className="material-symbols-outlined text-base">error</span>
                    <span>{localError || error}</span>
                    <button
                        onClick={() => {
                            setLocalError('');
                            dispatch(clearError());
                        }}
                        className="ml-auto text-red-500 hover:text-red-700"
                    >
                        <span className="material-symbols-outlined text-base">close</span>
                    </button>
                </div>
            )}

            <section className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-3xl font-black tracking-tight">Specialty Management</h1>
                    <p className="mt-1 text-sm text-slate-500">Configure medical specialties and doctor assignments.</p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary/90"
                >
                    New Specialty
                </button>
            </section>

            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                {loading ? (
                    <div className="py-16 text-center text-slate-500">Loading specialties...</div>
                ) : specialties.length === 0 ? (
                    <div className="py-16 text-center text-slate-400">No specialties found.</div>
                ) : (
                    <table className="w-full min-w-[760px] text-left">
                        <thead className="border-b border-slate-200 bg-slate-50">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Specialty</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Description</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Status</th>
                                <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-500">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {specialties.map((specialty) => {
                                const thumbnail = resolveImageSource(specialty.image, apiAssetBase);
                                return (
                                    <tr key={specialty.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                {thumbnail ? (
                                                    <img src={thumbnail} alt={specialty.name} className="h-10 w-10 rounded-lg object-cover" />
                                                ) : (
                                                    <div className="grid h-10 w-10 place-items-center rounded-lg bg-slate-100 text-slate-400">
                                                        <span className="material-symbols-outlined text-[18px]">image</span>
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="text-sm font-bold">{specialty.name}</p>
                                                    <p className="text-xs text-slate-500">ID: {specialty.id}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600">{specialty.description || '-'}</td>
                                        <td className="px-6 py-4">
                                            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">Active</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="inline-flex gap-1.5">
                                                <button
                                                    onClick={() => openEditModal(specialty)}
                                                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-primary"
                                                    title="Edit"
                                                >
                                                    <span className="material-symbols-outlined text-[20px]">edit</span>
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(specialty.id)}
                                                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600"
                                                    title="Delete"
                                                >
                                                    <span className="material-symbols-outlined text-[20px]">delete</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </section>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-xl">
                        <div className="flex items-center justify-between border-b border-slate-200 p-5">
                            <h3 className="text-lg font-black">{editingSpecialty ? 'Edit Specialty' : 'New Specialty'}</h3>
                            <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4 p-5">
                            <div>
                                <label className="mb-1 block text-sm font-semibold text-slate-700">Specialty Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-semibold text-slate-700">Description *</label>
                                <textarea
                                    required
                                    rows={3}
                                    value={formData.description}
                                    onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-semibold text-slate-700">Specialty Image</label>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
                                />

                                {imagePreview ? (
                                    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                                        <img src={imagePreview} alt="Specialty preview" className="h-40 w-full rounded-md object-cover" />
                                        <p className="mt-2 text-xs text-emerald-700">
                                            {formData.imageFile ? `Selected: ${formData.imageFile.name}` : 'Current specialty image'}
                                        </p>
                                    </div>
                                ) : (
                                    <p className="mt-2 text-xs text-slate-500">No image selected.</p>
                                )}

                                {(formData.imageFile || imagePreview) && (
                                    <button
                                        type="button"
                                        onClick={handleRemoveImage}
                                        className="mt-2 text-xs font-semibold text-red-600 hover:text-red-700"
                                    >
                                        Remove image
                                    </button>
                                )}
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {submitting ? 'Saving...' : editingSpecialty ? 'Save Changes' : 'Create Specialty'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminShell>
    );
};

export default SpecialtyManagement;
