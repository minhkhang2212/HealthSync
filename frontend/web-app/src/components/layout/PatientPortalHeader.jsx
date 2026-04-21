import React from 'react';

const NAV_BUTTON_CLASS = 'rounded-lg px-3 py-2 text-sm font-semibold transition';
const getNavButtonClass = (isActive) =>
    `${NAV_BUTTON_CLASS} ${isActive ? 'bg-blue-50 text-primary' : 'text-slate-700 hover:bg-slate-100'}`;

const PatientPortalHeader = ({
    user,
    activeItem = null,
    onHome,
    onFindDoctors,
    onClinics,
    onAiSupport,
    onAppointments,
    onLogout,
}) => {
    const [menuOpen, setMenuOpen] = React.useState(false);
    const aiActive = activeItem === 'ai';
    const findDoctorsActive = activeItem === 'doctors';
    const clinicsActive = activeItem === 'clinics';
    const appointmentsActive = activeItem === 'appointments';

    React.useEffect(() => {
        if (!menuOpen) return undefined;
        const handleClickOutside = (event) => {
            if (!event.target?.closest?.('[data-patient-menu]')) setMenuOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [menuOpen]);

    const closeMenuAfterAction = (handler) => () => {
        setMenuOpen(false);
        handler?.();
    };

    return (
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
            <div className="mx-auto flex w-full max-w-[1240px] items-center justify-between gap-3 px-4 py-3 sm:px-8">
                <button type="button" onClick={onHome} className="flex items-center gap-3 text-left">
                    <div className="grid size-9 place-items-center rounded-lg bg-primary text-white">
                        <span className="material-symbols-outlined text-[20px]">health_and_safety</span>
                    </div>
                    <div>
                        <p className="font-black">HealthSync</p>
                        <p className="text-xs text-slate-500">Patient Portal</p>
                    </div>
                </button>

                <nav className="hidden items-center gap-2 md:flex">
                    <button type="button" onClick={onFindDoctors} className={getNavButtonClass(findDoctorsActive)}>Find Doctors</button>
                    <button type="button" onClick={onClinics} className={getNavButtonClass(clinicsActive)}>Clinics</button>
                    <button
                        type="button"
                        onClick={onAiSupport}
                        className={`${NAV_BUTTON_CLASS} group inline-flex items-center gap-2 ${aiActive ? 'bg-blue-50 text-primary' : 'text-primary hover:bg-blue-50'}`}
                    >
                        <span className="material-symbols-outlined text-[18px] text-amber-500 transition-transform duration-200 group-hover:scale-110 group-hover:rotate-12">auto_awesome</span>
                        <span>AI Support</span>
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-amber-700 transition-transform duration-200 group-hover:scale-105">
                            New
                        </span>
                    </button>
                    <button type="button" onClick={onAppointments} className={getNavButtonClass(appointmentsActive)}>My Appointments</button>
                </nav>

                <div className="relative" data-patient-menu>
                    <button type="button" onClick={() => setMenuOpen((previous) => !previous)} className="flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-sm">
                        <span className="max-w-28 truncate font-semibold">{user?.name || 'Patient'}</span>
                        <span className="material-symbols-outlined text-[18px] text-slate-500">expand_more</span>
                    </button>
                    {menuOpen && (
                        <div className="absolute right-0 mt-2 w-52 rounded-xl border border-slate-200 bg-white p-2 shadow-md">
                            <button type="button" onClick={closeMenuAfterAction(onClinics)} className={`w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100 ${clinicsActive ? 'bg-blue-50 text-primary' : ''}`}>Clinics</button>
                            <button
                                type="button"
                                onClick={closeMenuAfterAction(onAiSupport)}
                                className={`group flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition hover:bg-blue-50 ${aiActive ? 'bg-blue-50 text-primary' : 'text-primary'}`}
                            >
                                <span className="inline-flex items-center gap-2 font-semibold">
                                    <span className="material-symbols-outlined text-[18px] text-amber-500 transition-transform duration-200 group-hover:scale-110 group-hover:rotate-12">auto_awesome</span>
                                    AI Support
                                </span>
                                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-amber-700 transition-transform duration-200 group-hover:scale-105">
                                    New
                                </span>
                            </button>
                            <button type="button" onClick={closeMenuAfterAction(onAppointments)} className={`w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100 ${appointmentsActive ? 'bg-blue-50 text-primary' : ''}`}>My Appointments</button>
                            <button type="button" onClick={closeMenuAfterAction(onLogout)} className="mt-1 w-full rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50">Logout</button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default PatientPortalHeader;
