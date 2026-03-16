import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchUsers, clearError } from '../store/slices/userSlice';
import AdminShell from '../components/layout/AdminShell';

const PatientManagement = () => {
    const dispatch = useDispatch();
    const { users, loading, error } = useSelector((state) => state.user);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        dispatch(fetchUsers({ roleId: 'R3', search: searchTerm }));
    }, [dispatch, searchTerm]);

    const handleSearch = (e) => {
        // Debounce can be added later if needed
    };

    return (
        <AdminShell
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Search patients by name, email, phone..."
        >
            {error && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <span className="material-symbols-outlined text-base">error</span>
                    <span>{error}</span>
                    <button
                        onClick={() => dispatch(clearError())}
                        className="ml-auto text-red-500 hover:text-red-700"
                    >
                        <span className="material-symbols-outlined text-base">close</span>
                    </button>
                </div>
            )}

            <section className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-3xl font-black tracking-tight">Patient Management</h1>
                    <p className="mt-1 text-sm text-slate-500">View registered patients in the system.</p>
                </div>
            </section>

            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm mt-6">
                {loading ? (
                    <div className="py-16 text-center text-slate-500">Loading patients...</div>
                ) : users.length === 0 ? (
                    <div className="py-16 text-center text-slate-400">No patients found.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[760px] text-left">
                            <thead className="border-b border-slate-200 bg-slate-50">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Patient</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Contact</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Gender</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {users.map((patient) => (
                                    <tr key={patient.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                {patient.image ? (
                                                    <img src={patient.image} alt={patient.name} className="h-10 w-10 rounded-full object-cover" />
                                                ) : (
                                                    <div className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-500 font-bold">
                                                        {patient.name?.charAt(0)?.toUpperCase()}
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="text-sm font-bold">{patient.name}</p>
                                                    <p className="text-xs text-slate-500">ID: {patient.id}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600">
                                            <div>{patient.email}</div>
                                            <div className="text-slate-500 text-xs mt-0.5">{patient.phoneNumber || 'No phone'}</div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600">
                                            {patient.gender === 'M' ? 'Male' : patient.gender === 'F' ? 'Female' : patient.gender || '-'}
                                        </td>
                                        <td className="px-6 py-4">
                                            {patient.isActive ? (
                                                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">Active</span>
                                            ) : (
                                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">Inactive</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </AdminShell>
    );
};

export default PatientManagement;
