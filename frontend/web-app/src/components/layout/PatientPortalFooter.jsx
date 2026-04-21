import React from 'react';
import { PATIENT_PORTAL_FOOTER_COLUMNS } from './patientPortalConfig';

const PatientPortalFooter = () => {
    const currentYear = new Date().getFullYear();
    const updatedDate = new Date().toLocaleDateString('en-GB');

    return (
        <footer className="mx-auto w-full max-w-[1240px] bg-white px-4 py-10 sm:px-8 sm:py-12">
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr]">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="grid size-9 place-items-center rounded-lg bg-primary text-white">
                            <span className="material-symbols-outlined text-[20px]">health_and_safety</span>
                        </div>
                        <div>
                            <p className="font-black">HealthSync</p>
                            <p className="text-xs text-slate-500">Patient Portal</p>
                        </div>
                    </div>
                    <p className="mt-4 max-w-xs text-sm text-slate-500">
                        A healthcare booking platform to help patients discover clinics, connect with doctors, and manage appointments.
                    </p>
                </div>

                {PATIENT_PORTAL_FOOTER_COLUMNS.map((column) => (
                    <div key={column.title}>
                        <h3 className="text-sm font-black text-slate-900">{column.title}</h3>
                        <div className="mt-3 space-y-2">
                            {column.links.map((link) => (
                                <a key={link} href="#" className="block text-sm text-slate-500 hover:text-primary">
                                    {link}
                                </a>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            <div className="mt-8 flex flex-col gap-2 border-t border-slate-200 pt-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                <p>&copy; {currentYear} HealthSync Platform. All rights reserved.</p>
                <p>Last updated: {updatedDate}</p>
            </div>
        </footer>
    );
};

export default PatientPortalFooter;
