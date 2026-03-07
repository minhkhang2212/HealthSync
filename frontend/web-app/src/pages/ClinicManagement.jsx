import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchClinics, createClinic, updateClinic, deleteClinic, clearError } from '../store/slices/clinicSlice';
import AdminShell from '../components/layout/AdminShell';

const ClinicManagement = () => {
    const dispatch = useDispatch();
    const { clinics, loading, error } = useSelector((state) => state.clinic);
    const [showModal, setShowModal] = useState(false);
    const [editingClinic, setEditingClinic] = useState(null);
    const [formData, setFormData] = useState({ name: '', address: '', description: '', image: '' });

    useEffect(() => {
        if (clinics.length === 0) {
            dispatch(fetchClinics());
        }
    }, [dispatch, clinics.length]);

    const openCreateModal = () => {
        setEditingClinic(null);
        setFormData({ name: '', address: '', description: '', image: '' });
        setShowModal(true);
    };

    const openEditModal = (clinic) => {
        setEditingClinic(clinic);
        setFormData({
            name: clinic.name || '',
            address: clinic.address || '',
            description: clinic.description || '',
            image: clinic.image || '',
        });
        setShowModal(true);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (editingClinic) {
            await dispatch(updateClinic({ id: editingClinic.id, data: formData }));
        } else {
            await dispatch(createClinic(formData));
        }
        setShowModal(false);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this clinic?')) {
            dispatch(deleteClinic(id));
        }
    };

    return (
        <AdminShell>
            {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
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
                    <p className="text-sm text-slate-500 mt-1">Directory of all registered healthcare facilities and clinic branches.</p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary/90"
                >
                    New Clinic
                </button>
            </section>

            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                {loading ? (
                    <div className="py-16 text-center text-slate-500">Loading clinics...</div>
                ) : clinics.length === 0 ? (
                    <div className="py-16 text-center text-slate-400">No clinics found.</div>
                ) : (
                    <table className="w-full min-w-[700px] text-left">
                        <thead className="border-b border-slate-200 bg-slate-50">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Clinic</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Address</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Status</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-right text-slate-500">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {clinics.map((clinic) => (
                                <tr key={clinic.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4">
                                        <p className="text-sm font-bold">{clinic.name}</p>
                                        <p className="text-xs text-slate-500">ID: {clinic.id}</p>
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
                            ))}
                        </tbody>
                    </table>
                )}
            </section>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-xl">
                        <div className="flex items-center justify-between border-b border-slate-200 p-5">
                            <h3 className="text-lg font-black">{editingClinic ? 'Edit Clinic' : 'New Clinic'}</h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
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
                                    onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-semibold text-slate-700">Address *</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.address}
                                    onChange={(event) => setFormData({ ...formData, address: event.target.value })}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-semibold text-slate-700">Description *</label>
                                <textarea
                                    required
                                    rows={3}
                                    value={formData.description}
                                    onChange={(event) => setFormData({ ...formData, description: event.target.value })}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-semibold text-slate-700">Image URL</label>
                                <input
                                    type="url"
                                    value={formData.image}
                                    onChange={(event) => setFormData({ ...formData, image: event.target.value })}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary"
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
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
