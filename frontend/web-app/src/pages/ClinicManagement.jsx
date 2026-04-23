import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchClinics, createClinic, updateClinic, deleteClinic, clearError } from '../store/slices/clinicSlice';
import AdminShell from '../components/layout/AdminShell';
import { getApiAssetBase } from '../utils/apiClient';

const INITIAL_FORM = {
    name: '',
    address: '',
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

const normalizeSearchText = (value) =>
    String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();

const ClinicManagement = () => {
    const dispatch = useDispatch();
    const fileInputRef = useRef(null);

    const { clinics, loading, error } = useSelector((state) => state.clinic);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingClinic, setEditingClinic] = useState(null);
    const [formData, setFormData] = useState(INITIAL_FORM);
    const [imagePreview, setImagePreview] = useState('');

    const apiAssetBase = useMemo(() => getApiAssetBase(), []);
    const filteredClinics = useMemo(() => {
        const searchKey = normalizeSearchText(search);

        if (!searchKey) {
            return clinics;
        }

        return clinics.filter((clinic) =>
            normalizeSearchText(
                `${clinic.id || ''} ${clinic.name || ''} ${clinic.address || ''} ${clinic.description || ''}`
            ).includes(searchKey)
        );
    }, [clinics, search]);
    const showingText = filteredClinics.length === clinics.length
        ? `Showing all ${clinics.length} clinics.`
        : `Showing ${filteredClinics.length} of ${clinics.length} clinics.`;

    useEffect(() => {
        if (clinics.length === 0) {
            dispatch(fetchClinics());
        }
    }, [dispatch, clinics.length]);

    const openCreateModal = () => {
        setEditingClinic(null);
        setFormData(INITIAL_FORM);
        setImagePreview('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        setShowModal(true);
    };

    const openEditModal = (clinic) => {
        setEditingClinic(clinic);
        setFormData({
            name: clinic.name || '',
            address: clinic.address || '',
            description: clinic.description || '',
            image: clinic.image || '',
            imageFile: null,
            removeImage: false,
        });
        setImagePreview(resolveImageSource(clinic.image, apiAssetBase) || '');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingClinic(null);
        setFormData(INITIAL_FORM);
        setImagePreview('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleImageChange = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            event.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            setImagePreview(String(reader.result || ''));
        };
        reader.readAsDataURL(file);

        setFormData((prev) => ({
            ...prev,
            imageFile: file,
            removeImage: false,
        }));
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

        const payload = {
            name: formData.name,
            address: formData.address,
            description: formData.description,
            image: formData.image,
            imageFile: formData.imageFile,
            removeImage: formData.removeImage,
        };

        const action = editingClinic
            ? updateClinic({ id: editingClinic.id, data: payload })
            : createClinic(payload);
        const result = await dispatch(action);

        if (
            (editingClinic && updateClinic.fulfilled.match(result)) ||
            (!editingClinic && createClinic.fulfilled.match(result))
        ) {
            closeModal();
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this clinic?')) {
            dispatch(deleteClinic(id));
        }
    };

    return (
        <AdminShell>
            {error && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <span className="material-symbols-outlined text-base">error</span>
                    <span>{error}</span>
                    <button onClick={() => dispatch(clearError())} className="ml-auto text-red-500 hover:text-red-700">
                        <span className="material-symbols-outlined text-base">close</span>
                    </button>
                </div>
            )}

            <section className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-3xl font-black tracking-tight">Clinic Management</h1>
                    <p className="mt-1 text-sm text-slate-500">Directory of all registered healthcare facilities and clinic branches.</p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary/90"
                >
                    New Clinic
                </button>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="space-y-4">
                    <label className="space-y-2 text-sm font-semibold text-slate-700">
                        <span>Search</span>
                        <div className="flex h-11 items-center rounded-lg border border-slate-300 bg-white text-slate-500 focus-within:border-primary">
                            <span className="material-symbols-outlined pl-3 text-[20px]">search</span>
                            <input
                                type="search"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Search clinics by name, address, description..."
                                className="h-full w-full bg-transparent px-2 pr-3 text-sm font-medium text-slate-700 outline-none placeholder:text-slate-400"
                            />
                        </div>
                    </label>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-100 pt-3 text-sm">
                        <span className="font-semibold text-slate-700">{showingText}</span>
                        <span className="text-slate-500">Search matches clinic name, address, description, and ID.</span>
                    </div>
                </div>
            </section>

            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                {loading ? (
                    <div className="py-16 text-center text-slate-500">Loading clinics...</div>
                ) : clinics.length === 0 ? (
                    <div className="py-16 text-center text-slate-400">No clinics found.</div>
                ) : filteredClinics.length === 0 ? (
                    <div className="py-16 text-center text-slate-400">No clinics match the current search.</div>
                ) : (
                    <table className="w-full min-w-[760px] text-left">
                        <thead className="border-b border-slate-200 bg-slate-50">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Clinic</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Address</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Status</th>
                                <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-500">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {filteredClinics.map((clinic) => {
                                const thumbnail = resolveImageSource(clinic.image, apiAssetBase);
                                return (
                                    <tr key={clinic.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                {thumbnail ? (
                                                    <img src={thumbnail} alt={clinic.name} className="h-10 w-10 rounded-lg object-cover" />
                                                ) : (
                                                    <div className="grid h-10 w-10 place-items-center rounded-lg bg-slate-100 text-slate-400">
                                                        <span className="material-symbols-outlined text-[18px]">image</span>
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="text-sm font-bold">{clinic.name}</p>
                                                    <p className="text-xs text-slate-500">ID: {clinic.id}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600">{clinic.address || '-'}</td>
                                        <td className="px-6 py-4">
                                            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">Active</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="inline-flex gap-1.5">
                                                <button
                                                    onClick={() => openEditModal(clinic)}
                                                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-primary"
                                                    title="Edit"
                                                >
                                                    <span className="material-symbols-outlined text-[20px]">edit</span>
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(clinic.id)}
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
                            <h3 className="text-lg font-black">{editingClinic ? 'Edit Clinic' : 'New Clinic'}</h3>
                            <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4 p-5">
                            <div>
                                <label className="mb-1 block text-sm font-semibold text-slate-700">Clinic Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-semibold text-slate-700">Address *</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.address}
                                    onChange={(event) => setFormData((prev) => ({ ...prev, address: event.target.value }))}
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
                                <label className="mb-1 block text-sm font-semibold text-slate-700">Clinic Image</label>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
                                />

                                {imagePreview ? (
                                    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                                        <img
                                            src={imagePreview}
                                            alt="Clinic preview"
                                            className="h-40 w-full rounded-md object-cover"
                                        />
                                        <p className="mt-2 text-xs text-emerald-700">
                                            {formData.imageFile ? `Selected: ${formData.imageFile.name}` : 'Current clinic image'}
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
                                <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white">
                                    {editingClinic ? 'Save Changes' : 'Create Clinic'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminShell>
    );
};

export default ClinicManagement;
