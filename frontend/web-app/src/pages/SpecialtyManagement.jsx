import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchSpecialties, createSpecialty, updateSpecialty, deleteSpecialty, clearError } from '../store/slices/specialtySlice';
import AdminShell from '../components/layout/AdminShell';

const SpecialtyManagement = () => {
    const dispatch = useDispatch();
    const { specialties, loading, error } = useSelector((state) => state.specialty);
    const [showModal, setShowModal] = useState(false);
    const [editingSpecialty, setEditingSpecialty] = useState(null);
    const [formData, setFormData] = useState({ name: '', description: '' });

    useEffect(() => {
        if (specialties.length === 0) {
            dispatch(fetchSpecialties());
        }
    }, [dispatch, specialties.length]);

    const openCreateModal = () => {
        setEditingSpecialty(null);
        setFormData({ name: '', description: '' });
        setShowModal(true);
    };

    const openEditModal = (specialty) => {
        setEditingSpecialty(specialty);
        setFormData({
            name: specialty.name || '',
            description: specialty.description || '',
        });
        setShowModal(true);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (editingSpecialty) {
            await dispatch(updateSpecialty({ id: editingSpecialty.id, data: formData }));
        } else {
            await dispatch(createSpecialty(formData));
        }
        setShowModal(false);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this specialty?')) {
            dispatch(deleteSpecialty(id));
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
                    <h1 className="text-3xl font-black tracking-tight">Specialty Management</h1>
                    <p className="text-sm text-slate-500 mt-1">Configure medical specialties and doctor assignments.</p>
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
                    <table className="w-full min-w-[700px] text-left">
                        <thead className="border-b border-slate-200 bg-slate-50">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Specialty</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Description</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Status</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-right text-slate-500">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {specialties.map((specialty) => (
                                <tr key={specialty.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4">
                                        <p className="text-sm font-bold">{specialty.name}</p>
                                        <p className="text-xs text-slate-500">ID: {specialty.id}</p>
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
                            ))}
                        </tbody>
                    </table>
                )}
            </section>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-xl">
                        <div className="flex items-center justify-between border-b border-slate-200 p-5">
                            <h3 className="text-lg font-black">{editingSpecialty ? 'Edit Specialty' : 'New Specialty'}</h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
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
                                    onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-semibold text-slate-700">Description</label>
                                <textarea
                                    rows={3}
                                    value={formData.description}
                                    onChange={(event) => setFormData({ ...formData, description: event.target.value })}
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
                                    {editingSpecialty ? 'Save Changes' : 'Create Specialty'}
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
