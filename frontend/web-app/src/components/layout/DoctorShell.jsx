import { NavLink } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logoutUser } from '../../store/slices/authSlice';

const navItems = [
    { to: '/doctor/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { to: '/doctor/appointments', label: 'My Appointments', icon: 'calendar_month' },
];

const DoctorShell = ({
    children,
}) => {
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);

    return (
        <div className="min-h-screen bg-background-light text-slate-900 font-display">
            <header className="sticky top-0 z-40 border-b border-slate-200 bg-white px-4 py-3 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="grid size-8 place-items-center rounded-lg bg-primary/10">
                            <span className="material-symbols-outlined text-primary">health_and_safety</span>
                        </div>
                        <p className="text-lg font-bold tracking-tight">HealthSync</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="hidden text-sm font-bold sm:inline">{user?.name || 'Doctor'}</span>
                        <button
                            type="button"
                            onClick={() => dispatch(logoutUser())}
                            className="rounded-lg bg-red-100 px-3 py-2 text-xs font-bold text-red-700"
                        >
                            Sign Out
                        </button>
                    </div>
                </div>
            </header>

            <div className="flex min-h-[calc(100vh-65px)]">
                <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white p-3 lg:block">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) =>
                                `mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${isActive ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-100'}`
                            }
                        >
                            <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                            {item.label}
                        </NavLink>
                    ))}
                </aside>

                <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                    <div className="mx-auto max-w-7xl space-y-6">{children}</div>
                </main>
            </div>
        </div>
    );
};

export default DoctorShell;
