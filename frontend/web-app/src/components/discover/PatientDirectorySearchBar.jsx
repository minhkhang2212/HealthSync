import React from 'react';

const ACTION_BUTTON_CLASS =
    'inline-flex h-14 items-center justify-center rounded-xl bg-primary px-8 text-sm font-black text-white shadow-sm transition hover:bg-blue-700';

const INPUT_SHELL_CLASS =
    'flex h-14 min-w-0 items-center gap-3 rounded-xl border border-transparent bg-slate-100 px-4 text-sm text-slate-700 transition focus-within:border-primary focus-within:bg-white';

const PatientDirectorySearchBar = ({
    mode = 'search',
    value = '',
    onChange,
    onSubmit,
    onLauncherClick,
    placeholder = 'Search specialty, doctor, or clinic...',
    actionLabel = 'Search',
    className = '',
    launcherAriaLabel = 'Open patient discover directory',
}) => {
    if (mode === 'launcher') {
        return (
            <button
                type="button"
                onClick={onLauncherClick}
                aria-label={launcherAriaLabel}
                className={`grid w-full gap-3 text-left lg:grid-cols-[minmax(0,1fr)_auto] ${className}`}
            >
                <span className={`${INPUT_SHELL_CLASS} overflow-hidden`}>
                    <span className="material-symbols-outlined text-[18px] text-slate-400">search</span>
                    <span className="truncate text-sm text-slate-400">{placeholder}</span>
                </span>
                <span className={ACTION_BUTTON_CLASS}>{actionLabel}</span>
            </button>
        );
    }

    const handleSubmit = (event) => {
        event.preventDefault();
        onSubmit?.();
    };

    return (
        <form onSubmit={handleSubmit} className={`grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] ${className}`}>
            <label className={INPUT_SHELL_CLASS}>
                <span className="material-symbols-outlined text-[18px] text-slate-400">search</span>
                <input
                    type="search"
                    name="discover-search"
                    value={value}
                    onChange={(event) => onChange?.(event.target.value)}
                    placeholder={placeholder}
                    className="w-full min-w-0 border-none bg-transparent p-0 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:ring-0"
                    aria-label={placeholder}
                />
            </label>
            <button type="submit" className={ACTION_BUTTON_CLASS}>
                {actionLabel}
            </button>
        </form>
    );
};

export default PatientDirectorySearchBar;
