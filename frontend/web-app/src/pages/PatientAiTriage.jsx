import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logoutUser } from '../store/slices/authSlice';
import { clearAiError, resetAiSession, sendAiTriageMessage, startAiTriageSession } from '../store/slices/aiSlice';

const URGENCY_META = {
    low: { title: 'Low Urgency', border: 'border-emerald-500', badge: 'bg-emerald-100 text-emerald-700', icon: 'verified' },
    medium: { title: 'Medium Urgency', border: 'border-orange-500', badge: 'bg-orange-100 text-orange-700', icon: 'priority_high' },
    urgent: { title: 'Urgent', border: 'border-red-500', badge: 'bg-red-100 text-red-700', icon: 'warning' },
    emergency: { title: 'Emergency', border: 'border-red-600', badge: 'bg-red-100 text-red-700', icon: 'emergency' },
};

const normalizeSearchText = (value) =>
    String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();

const resolveSpecialtyIcon = (specialtyName) => {
    const searchText = normalizeSearchText(specialtyName);
    if (searchText.includes('cardio') || searchText.includes('heart')) return 'favorite';
    if (searchText.includes('derma') || searchText.includes('skin')) return 'dermatology';
    if (searchText.includes('neuro') || searchText.includes('brain')) return 'neurology';
    if (searchText.includes('pedia') || searchText.includes('child')) return 'child_care';
    if (searchText.includes('dental') || searchText.includes('tooth')) return 'dentistry';
    if (searchText.includes('internal')) return 'stethoscope';
    return 'medical_services';
};

const buildDoctorAiPrefill = (slot, prefill) => ({
    aiPrefill: {
        reasonForVisit: prefill?.reasonForVisit || '',
        doctorId: slot.doctorId,
        specialtyId: slot.specialtyId,
        specialtyName: slot.specialtyName,
        date: slot.date,
        timeType: slot.timeType,
    },
});

const PatientAiTriage = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);
    const { sessionId, disclaimer, messages, latestTriage, latestRecommendations, loading, initializing, error } = useSelector((state) => state.ai);

    const [menuOpen, setMenuOpen] = React.useState(false);
    const [draft, setDraft] = React.useState('');
    const autoStartRequestedRef = React.useRef(false);
    const chatViewportRef = React.useRef(null);

    const hasAssessment = latestTriage?.readyForAssessment ?? Boolean(
        latestTriage?.urgency
        || latestTriage?.symptomSummary
        || (latestTriage?.specialtyCandidates?.length || 0) > 0
        || (latestTriage?.redFlags?.length || 0) > 0
    );
    const urgencyMeta = URGENCY_META[latestTriage?.urgency] || URGENCY_META.medium;
    const specialtyCandidates = latestTriage?.specialtyCandidates || [];
    const doctorRecommendations = latestRecommendations?.doctorRecommendations || [];
    const slotRecommendations = latestRecommendations?.slotRecommendations || [];
    const canViewSpecialists = Boolean(latestRecommendations?.prefill);
    const topSlot = slotRecommendations[0] || null;

    React.useEffect(() => {
        if (!menuOpen) return undefined;
        const handleClickOutside = (event) => {
            if (!event.target?.closest?.('[data-patient-menu]')) setMenuOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [menuOpen]);

    React.useEffect(() => {
        if (sessionId || messages.length > 0 || initializing || autoStartRequestedRef.current) return;
        autoStartRequestedRef.current = true;
        dispatch(clearAiError());
        dispatch(startAiTriageSession()).finally(() => {
            autoStartRequestedRef.current = false;
        });
    }, [dispatch, initializing, messages.length, sessionId]);

    React.useEffect(() => {
        const viewport = chatViewportRef.current;
        if (viewport) viewport.scrollTop = viewport.scrollHeight;
    }, [messages, loading]);

    const handleLogout = async () => {
        dispatch(resetAiSession());
        await dispatch(logoutUser());
        navigate('/login');
    };

    const handleResetAssessment = () => {
        setDraft('');
        dispatch(resetAiSession());
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        const message = draft.trim();
        if (message.length < 5) return;
        dispatch(clearAiError());
        const result = await dispatch(sendAiTriageMessage(message));
        if (sendAiTriageMessage.fulfilled.match(result)) setDraft('');
    };

    const handleViewRecommendedDoctors = () => {
        if (!latestRecommendations?.prefill) return;
        navigate('/patient', { state: { aiPrefill: latestRecommendations.prefill } });
    };

    const handleBookSlot = (slot) => {
        navigate(`/patient/doctor/${slot.doctorId}`, { state: buildDoctorAiPrefill(slot, latestRecommendations?.prefill) });
    };

    return (
        <div className="min-h-screen bg-[#f6f7f8] font-['Inter'] text-slate-900 antialiased">
            <header className="fixed top-0 z-50 w-full border-b border-slate-200 bg-white/90 shadow-lg shadow-blue-500/5 backdrop-blur-xl">
                <div className="mx-auto flex h-20 w-full max-w-[1440px] items-center justify-between gap-4 px-6 md:px-10">
                    <Link to="/patient" className="flex items-center gap-3">
                        <div className="grid size-9 place-items-center rounded-xl bg-primary text-white">
                            <span className="material-symbols-outlined text-[20px]">health_and_safety</span>
                        </div>
                        <div>
                            <p className="text-xl font-black tracking-tight text-slate-900">HealthSync</p>
                            <p className="text-xs font-medium text-slate-500">Patient Portal</p>
                        </div>
                    </Link>

                    <nav className="hidden items-center gap-8 md:flex">
                        <Link className="font-medium text-slate-500 transition-colors hover:text-primary" to="/patient">Dashboard</Link>
                        <span className="border-b-4 border-primary pb-1 font-black text-primary">Symptom Checker</span>
                        <Link className="font-medium text-slate-500 transition-colors hover:text-primary" to="/patient/clinics">Clinics</Link>
                    </nav>

                    <div className="flex items-center gap-4">
                        <a href="tel:999" className="hidden rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition-transform active:scale-95 md:inline-flex">
                            Emergency Help
                        </a>
                        <div className="relative" data-patient-menu>
                            <button onClick={() => setMenuOpen((previous) => !previous)} className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1 hover:bg-slate-50">
                                <div className="grid size-10 place-items-center rounded-full border-2 border-blue-100 bg-slate-100 text-slate-500">
                                    <span className="material-symbols-outlined text-[24px]">account_circle</span>
                                </div>
                                <span className="hidden max-w-28 truncate text-sm font-semibold text-slate-700 lg:block">{user?.name}</span>
                                <span className="material-symbols-outlined text-[18px] text-slate-400">expand_more</span>
                            </button>
                            {menuOpen && (
                                <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-100 bg-white py-2 shadow-xl">
                                    <div className="border-b border-slate-50 px-4 py-2">
                                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Patient Portal</p>
                                    </div>
                                    <Link to="/patient" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50">
                                        <span className="material-symbols-outlined text-lg text-primary">dashboard</span>Dashboard
                                    </Link>
                                    <Link to="/patient/clinics" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50">
                                        <span className="material-symbols-outlined text-lg text-primary">local_hospital</span>Clinics
                                    </Link>
                                    <div className="my-1 h-px bg-slate-100" />
                                    <button onClick={handleLogout} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-red-500 hover:bg-red-50">
                                        <span className="material-symbols-outlined text-lg">logout</span>Logout
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-[1440px] px-6 pb-16 pt-28 md:px-10">
                <section className="mb-10">
                    <div className="flex flex-col justify-between gap-6 border-l-8 border-primary pl-8 md:flex-row md:items-center">
                        <div className="max-w-3xl">
                            <div className="mb-3 flex items-center gap-2">
                                <span className="rounded-full bg-blue-100 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary">Clinical Intelligence</span>
                                <span className="flex items-center gap-1 text-primary">
                                    <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest">Live Engine</span>
                                </span>
                            </div>
                            <h1 className="mb-4 text-4xl font-black tracking-tighter text-slate-900 md:text-5xl">HealthAI Assistant</h1>
                            <p className="text-lg leading-relaxed text-slate-600">Describe your symptoms for an immediate urgency assessment and specialist recommendations.</p>
                        </div>
                        <button type="button" onClick={handleResetAssessment} className="inline-flex items-center gap-2 rounded-2xl border border-slate-100 bg-white px-6 py-3 font-bold text-slate-900 shadow-md hover:bg-slate-50 active:scale-95">
                            <span className="material-symbols-outlined text-primary">refresh</span>Start New Assessment
                        </button>
                    </div>
                </section>

                <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
                    <div className="space-y-6 lg:col-span-7">
                        <div className="flex min-h-[560px] flex-col overflow-hidden rounded-[28px] bg-white shadow-xl shadow-slate-200/50">
                            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-8 py-5">
                                <div className="flex items-center gap-3">
                                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-white">
                                        <span className="material-symbols-outlined">robot_2</span>
                                    </div>
                                    <div>
                                        <h3 className="font-bold leading-none text-slate-900">Diagnostic Interface</h3>
                                        <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-slate-500">End-to-End HIPAA Encrypted</p>
                                    </div>
                                </div>
                                <Link to="/patient" className="hidden rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold uppercase tracking-widest text-slate-500 hover:border-slate-300 hover:text-slate-700 sm:inline-flex">
                                    Back to Dashboard
                                </Link>
                            </div>

                            <div ref={chatViewportRef} className="flex-grow space-y-6 overflow-y-auto bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-8">
                                {initializing && messages.length === 0 && (
                                    <div className="flex max-w-[90%] gap-4">
                                        <div className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-400">
                                            <span className="material-symbols-outlined text-sm">clinical_notes</span>
                                        </div>
                                        <div className="rounded-2xl rounded-tl-none bg-slate-100 p-4 text-sm leading-relaxed text-slate-700">
                                            Opening a secure triage session and preparing the assistant.
                                        </div>
                                    </div>
                                )}
                                {messages.map((message, index) => {
                                    const isAssistant = message.role === 'assistant';
                                    return (
                                        <div key={`${message.role}-${index}`} className={`flex max-w-[90%] gap-4 ${isAssistant ? '' : 'ml-auto flex-row-reverse'}`}>
                                            <div className={`grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg ${isAssistant ? 'bg-slate-100 text-slate-400' : 'bg-primary/10 text-primary'}`}>
                                                <span className="material-symbols-outlined text-sm">{isAssistant ? 'clinical_notes' : 'person'}</span>
                                            </div>
                                            <div className={`rounded-2xl p-4 text-sm leading-relaxed ${isAssistant ? 'rounded-tl-none bg-slate-100 text-slate-800' : 'rounded-tr-none bg-primary text-white shadow-md shadow-blue-500/10'}`}>
                                                <p>{message.content}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                                {loading && (
                                    <div className="flex max-w-[90%] gap-4">
                                        <div className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-400">
                                            <span className="material-symbols-outlined text-sm">clinical_notes</span>
                                        </div>
                                        <div className="rounded-2xl rounded-tl-none bg-slate-100 p-4 text-sm leading-relaxed text-slate-700">
                                            Analyzing your symptoms and preparing specialist guidance.
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="border-t border-slate-100 bg-slate-50 p-6">
                                {error && <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
                                <form onSubmit={handleSubmit}>
                                    <div className="relative">
                                        <textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Describe your symptoms here..." className="h-28 w-full resize-none rounded-2xl border-none bg-white p-5 pb-20 pr-44 text-base text-slate-900 shadow-sm placeholder:text-slate-400 focus:ring-4 focus:ring-primary/10 sm:pr-48" />
                                        <button type="submit" disabled={loading || initializing || draft.trim().length < 5} className="absolute bottom-4 right-4 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-white shadow-lg hover:shadow-blue-500/30 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60">
                                            <span className="text-[10px] font-bold uppercase tracking-widest">Analyze</span>
                                            <span className="material-symbols-outlined text-base">send</span>
                                        </button>
                                    </div>
                                </form>
                                <div className="mt-4 flex items-start gap-2 opacity-60">
                                    <span className="material-symbols-outlined mt-0.5 text-xs text-slate-500">info</span>
                                    <p className="text-[10px] font-medium leading-relaxed text-slate-600">{disclaimer || 'Triage guidance only. Not a clinical diagnosis. In emergencies, call 911 immediately.'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6 lg:col-span-5">
                        <div className={`rounded-[28px] border-l-8 bg-white p-6 shadow-lg ${hasAssessment ? urgencyMeta.border : 'border-slate-200'}`}>
                            <div className="mb-4 flex items-start justify-between gap-4">
                                <div>
                                    <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Triage Status</p>
                                    <h2 className="text-2xl font-black tracking-tight text-slate-900">
                                        {hasAssessment ? urgencyMeta.title : 'No assessment yet'}
                                    </h2>
                                </div>
                                <span className={`grid h-10 w-10 place-items-center rounded-full ${hasAssessment ? urgencyMeta.badge : 'bg-slate-100 text-slate-400'}`}>
                                    <span className="material-symbols-outlined">{hasAssessment ? urgencyMeta.icon : 'hourglass_empty'}</span>
                                </span>
                            </div>
                            <p className="text-sm leading-relaxed text-slate-600">
                                {hasAssessment
                                    ? (latestTriage?.explanation || 'Describe symptoms in detail and the assistant will estimate urgency here.')
                                    : 'Share actual symptoms, when they started, and severity before the assistant shows triage status.'}
                            </p>
                            {hasAssessment && latestTriage?.symptomSummary && (
                                <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
                                    {latestTriage.symptomSummary}
                                </div>
                            )}
                            {hasAssessment && (latestTriage?.redFlags?.length || 0) > 0 && (
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {latestTriage.redFlags.map((flag) => (
                                        <span key={flag} className="rounded-full bg-red-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-red-600">
                                            {flag}
                                        </span>
                                    ))}
                                </div>
                            )}
                            {hasAssessment && latestTriage?.urgency === 'emergency' && (
                                <a href="tel:999" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-xs font-black uppercase tracking-widest text-white shadow-md active:scale-95">
                                    <span className="material-symbols-outlined text-base">call</span>
                                    Contact Emergency Services
                                </a>
                            )}
                        </div>

                        <div className="rounded-[28px] bg-slate-900 p-6 text-white shadow-xl">
                            <div className="mb-6 flex items-center justify-between">
                                <h3 className="text-lg font-bold tracking-tight">Specialty Matches</h3>
                                <span className="material-symbols-outlined text-primary">clinical_notes</span>
                            </div>
                            {hasAssessment && specialtyCandidates.length > 0 ? (
                                <div className="space-y-3">
                                    {specialtyCandidates.slice(0, 3).map((candidate) => (
                                        <div key={candidate.id || candidate.name} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3.5">
                                            <div className="flex items-center gap-3">
                                                <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/20">
                                                    <span className="material-symbols-outlined text-sm text-primary">{resolveSpecialtyIcon(candidate.name)}</span>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold">{candidate.name}</p>
                                                    {candidate.reason && <p className="mt-1 text-xs leading-5 text-slate-300">{candidate.reason}</p>}
                                                </div>
                                            </div>
                                            <span className="text-[10px] font-black uppercase text-primary">
                                                {Math.round((candidate.confidence || 0) * 100)}% Match
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-relaxed text-slate-300">
                                    Describe real symptoms and timing before specialty matches appear here.
                                </div>
                            )}
                        </div>

                        <div className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-lg">
                            <div className="mb-4 flex items-center justify-between">
                                <h4 className="font-bold text-slate-900">Recommended Doctors</h4>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Available Now</span>
                            </div>
                            {hasAssessment && doctorRecommendations.length > 0 ? (
                                <div className="space-y-3">
                                    {doctorRecommendations.slice(0, 3).map((doctor) => (
                                        <article key={doctor.doctorId} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <p className="font-black text-slate-900">{doctor.doctorName}</p>
                                                    <p className="mt-1 text-sm font-semibold text-primary">{doctor.specialtyName}</p>
                                                </div>
                                                <span className="material-symbols-outlined text-slate-300">verified</span>
                                            </div>
                                            <p className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                                                <span className="material-symbols-outlined text-sm">location_on</span>
                                                {doctor.clinicName}
                                            </p>
                                            {doctor.reason && <p className="mt-3 text-xs leading-6 text-slate-600">{doctor.reason}</p>}
                                        </article>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-100 py-6 text-center">
                                    <div className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-slate-50 text-slate-300">
                                        <span className="material-symbols-outlined text-2xl">lock</span>
                                    </div>
                                    <p className="px-8 text-xs text-slate-500">
                                        {hasAssessment
                                            ? 'Matching physicians will appear as the assistant finds relevant doctors.'
                                            : 'Greeting messages alone do not unlock doctor recommendations.'}
                                    </p>
                                </div>
                            )}
                            <button type="button" onClick={handleViewRecommendedDoctors} disabled={!canViewSpecialists} className="mt-4 w-full rounded-xl bg-primary py-3.5 text-xs font-black uppercase tracking-widest text-white shadow-md shadow-blue-500/20 hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none">
                                View All Specialists
                            </button>
                        </div>

                        <div className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-lg">
                            <div className="mb-4 flex items-center justify-between">
                                <h4 className="font-bold text-slate-900">Matching Appointments</h4>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Live Slots</span>
                            </div>
                            {hasAssessment && slotRecommendations.length > 0 ? (
                                <div className="space-y-3">
                                    {slotRecommendations.slice(0, 3).map((slot) => (
                                        <article key={`${slot.doctorId}-${slot.date}-${slot.timeType}`} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                                            <p className="font-black text-slate-900">{slot.doctorName}</p>
                                            <p className="mt-1 text-sm font-semibold text-primary">{slot.specialtyName}</p>
                                            <p className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                                                <span className="material-symbols-outlined text-sm">calendar_month</span>
                                                {slot.dateLabel || slot.date} at {slot.timeLabel || slot.timeType}
                                            </p>
                                            <button type="button" onClick={() => handleBookSlot(slot)} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-primary px-4 py-2 text-xs font-black uppercase tracking-widest text-primary hover:bg-blue-50">
                                                Book This Slot
                                            </button>
                                        </article>
                                    ))}
                                </div>
                            ) : (
                                <div className="rounded-2xl border border-dashed border-slate-100 bg-slate-50 p-4 text-xs leading-6 text-slate-500">
                                    {hasAssessment
                                        ? 'Appointment suggestions will appear here once the assistant finds matching doctor availability.'
                                        : 'Appointments stay hidden until the assistant has enough symptom detail to assess.'}
                                </div>
                            )}
                            {topSlot && (
                                <button type="button" onClick={() => handleBookSlot(topSlot)} className="mt-4 w-full rounded-xl border border-slate-200 py-3 text-xs font-black uppercase tracking-widest text-slate-700 hover:border-slate-300 hover:bg-slate-50">
                                    Book Top Match
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            <footer className="w-full border-t border-slate-200 bg-slate-50 py-12 text-xs tracking-wide">
                <div className="mx-auto flex max-w-[1440px] flex-col items-center justify-between gap-6 px-6 md:flex-row md:px-10">
                    <div>
                        <div className="mb-2 font-black uppercase tracking-widest text-slate-400">HealthSync AI</div>
                        <p className="text-slate-500">Clinical precision by design. Advisory triage only.</p>
                    </div>
                    <div className="flex flex-wrap justify-center gap-6">
                        <Link className="text-slate-500 hover:text-slate-900" to="/patient">Dashboard</Link>
                        <Link className="text-slate-500 hover:text-slate-900" to="/patient/clinics">Clinics</Link>
                        <a className="font-bold text-primary" href="tel:999">Emergency Help</a>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default PatientAiTriage;
