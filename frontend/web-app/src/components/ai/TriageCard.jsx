import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { clearAiError, sendAiTriageMessage, startAiTriageSession } from '../../store/slices/aiSlice';
import { resolveUrgencyMeta } from './triageMeta';

const TriageCard = ({
    onApplyResults,
    onBookSlot,
    autoStart = false,
    showIntroHeader = true,
    applyButtonLabel = 'Use these results',
}) => {
    const dispatch = useDispatch();
    const {
        sessionId,
        disclaimer,
        messages,
        latestTriage,
        latestRecommendations,
        loading,
        initializing,
        error,
    } = useSelector((state) => state.ai);
    const [draft, setDraft] = React.useState('');
    const autoStartRequestedRef = React.useRef(false);

    const hasAssessment = latestTriage?.readyForAssessment ?? Boolean(
        latestTriage?.urgency
        || latestTriage?.symptomSummary
        || (latestTriage?.specialtyCandidates?.length || 0) > 0
        || (latestTriage?.redFlags?.length || 0) > 0
    );
    const urgencyMeta = resolveUrgencyMeta(latestTriage?.urgency);
    const hasRecommendations = Boolean(latestRecommendations?.prefill);
    const canBook = hasAssessment && latestTriage?.urgency !== 'emergency' && (latestRecommendations?.slotRecommendations?.length || 0) > 0;
    const showConversation = Boolean(sessionId) || messages.length > 0;

    React.useEffect(() => {
        if (!autoStart || showConversation || initializing || autoStartRequestedRef.current) {
            return;
        }

        autoStartRequestedRef.current = true;
        dispatch(clearAiError());
        dispatch(startAiTriageSession()).finally(() => {
            autoStartRequestedRef.current = false;
        });
    }, [autoStart, dispatch, initializing, showConversation]);

    const handleStart = async () => {
        dispatch(clearAiError());
        await dispatch(startAiTriageSession());
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        const message = draft.trim();
        if (!message) return;

        dispatch(clearAiError());
        const result = await dispatch(sendAiTriageMessage(message));
        if (sendAiTriageMessage.fulfilled.match(result)) {
            setDraft('');
        }
    };

    return (
        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-label="AI triage assistant">
            <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
                <div className="space-y-5">
                    {showIntroHeader && (
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">AI Triage Assistant</p>
                                <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">Describe symptoms, get the right specialty faster</h2>
                                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                                    Tell the assistant what you are feeling, when it started, and any clinic area preference. It will suggest urgency, specialty, and matching appointment options.
                                </p>
                            </div>
                            {hasAssessment && latestTriage?.urgency && (
                                <span className={`inline-flex shrink-0 items-center rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.14em] ${urgencyMeta.badgeClass}`}>
                                    {urgencyMeta.label}
                                </span>
                            )}
                        </div>
                    )}

                    <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                        {!showConversation ? (
                            <div className="space-y-4">
                                {autoStart ? (
                                    <>
                                        <div className="max-w-[86%] rounded-[22px] border border-slate-200 bg-white px-4 py-4 text-sm leading-6 text-slate-600 shadow-sm">
                                            {initializing
                                                ? 'Opening the assistant and preparing your triage session.'
                                                : 'The assistant is ready to start a short symptom assessment.'}
                                        </div>
                                        <p className="text-xs leading-5 text-slate-500">
                                            Your first session is created automatically on this page.
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <p className="text-sm leading-6 text-slate-600">
                                            Start a short chat and I will suggest the most relevant specialty and the earliest matching doctors available in HealthSync.
                                        </p>
                                        <button
                                            type="button"
                                            onClick={handleStart}
                                            disabled={initializing}
                                            className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            {initializing ? 'Starting...' : 'Start AI Triage'}
                                            <span className="material-symbols-outlined text-[18px]">chat</span>
                                        </button>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="max-h-[280px] space-y-3 overflow-y-auto pr-1">
                                    {messages.map((message, index) => {
                                        const isAssistant = message.role === 'assistant';
                                        return (
                                            <div key={`${message.role}-${index}`} className={`flex ${isAssistant ? 'justify-start' : 'justify-end'}`}>
                                                <div className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${
                                                    isAssistant
                                                        ? 'border border-slate-200 bg-white text-slate-700'
                                                        : 'bg-primary text-white'
                                                }`}>
                                                    {message.content}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-3">
                                    <textarea
                                        rows={4}
                                        value={draft}
                                        onChange={(event) => setDraft(event.target.value)}
                                        placeholder="Example: I have chest tightness and shortness of breath since this morning, and I prefer something near London Bridge."
                                        className="w-full rounded-[22px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-4 focus:ring-blue-100"
                                    />
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <p className="text-xs leading-5 text-slate-500">
                                            {disclaimer || 'AI triage is advisory only and does not replace urgent medical care.'}
                                        </p>
                                        <button
                                            type="submit"
                                            disabled={loading || initializing || draft.trim().length < 5}
                                            className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            {loading ? 'Thinking...' : 'Send'}
                                            <span className="material-symbols-outlined text-[18px]">send</span>
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            {error}
                        </div>
                    )}
                </div>

                <aside className="space-y-4">
                    <section className={`rounded-[24px] border p-4 ${hasAssessment ? urgencyMeta.panelClass : 'border-slate-200 bg-slate-50'}`}>
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Urgency Summary</p>
                                <p className="mt-2 text-xl font-black text-slate-900">{hasAssessment ? urgencyMeta.label : 'No assessment yet'}</p>
                            </div>
                            {hasAssessment && latestTriage?.urgency && (
                                <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.14em] ${urgencyMeta.badgeClass}`}>
                                    {urgencyMeta.label}
                                </span>
                            )}
                        </div>
                        <p className="mt-3 text-sm leading-6 text-slate-700">
                            {hasAssessment
                                ? (latestTriage?.explanation || 'Start a session to receive a structured urgency assessment and next booking suggestion.')
                                : 'Describe actual symptoms before the assistant shows urgency guidance.'}
                        </p>
                        {hasAssessment && latestTriage?.symptomSummary && (
                            <p className="mt-3 rounded-2xl bg-white/80 px-4 py-3 text-sm leading-6 text-slate-600">
                                {latestTriage.symptomSummary}
                            </p>
                        )}
                        {hasAssessment && (latestTriage?.redFlags?.length || 0) > 0 && (
                            <div className="mt-4 flex flex-wrap gap-2">
                                {latestTriage.redFlags.map((flag) => (
                                    <span key={flag} className="rounded-full border border-red-200 bg-white px-3 py-1 text-xs font-semibold text-red-700">
                                        {flag}
                                    </span>
                                ))}
                            </div>
                        )}
                    </section>

                    <section className="rounded-[24px] border border-slate-200 bg-white p-4">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Top Specialty Matches</p>
                                <h3 className="mt-2 text-lg font-black text-slate-900">Suggested specialties</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => hasRecommendations && onApplyResults?.(latestRecommendations?.prefill)}
                                disabled={!hasRecommendations}
                                className="rounded-2xl border border-primary px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-primary transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                            >
                                {applyButtonLabel}
                            </button>
                        </div>

                        {hasAssessment && (latestTriage?.specialtyCandidates?.length || 0) > 0 ? (
                            <div className="mt-4 space-y-3">
                                {latestTriage.specialtyCandidates.map((candidate) => (
                                    <article key={`${candidate.id || candidate.name}`} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                                        <div className="flex items-center justify-between gap-3">
                                            <p className="font-black text-slate-900">{candidate.name}</p>
                                            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-500">
                                                {Math.round((candidate.confidence || 0) * 100)}%
                                            </span>
                                        </div>
                                        {candidate.reason && <p className="mt-1 text-sm leading-6 text-slate-600">{candidate.reason}</p>}
                                    </article>
                                ))}
                            </div>
                        ) : (
                            <p className="mt-4 text-sm leading-6 text-slate-500">
                                {hasAssessment ? 'No specialty recommendation yet. Start the chat to generate one.' : 'Greeting messages do not generate specialty recommendations.'}
                            </p>
                        )}
                    </section>

                    <section className="rounded-[24px] border border-slate-200 bg-white p-4">
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Recommended Doctors</p>
                        {hasAssessment && (latestRecommendations?.doctorRecommendations?.length || 0) > 0 ? (
                            <div className="mt-4 space-y-3">
                                {latestRecommendations.doctorRecommendations.map((doctor) => (
                                    <article key={doctor.doctorId} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                                        <p className="font-black text-slate-900">{doctor.doctorName}</p>
                                        <p className="mt-1 text-sm text-primary">{doctor.specialtyName}</p>
                                        <p className="mt-1 text-sm leading-6 text-slate-500">{doctor.clinicName}</p>
                                        <p className="mt-2 text-sm leading-6 text-slate-600">{doctor.reason}</p>
                                    </article>
                                ))}
                            </div>
                        ) : (
                            <p className="mt-4 text-sm leading-6 text-slate-500">
                                {!hasAssessment
                                    ? 'Greeting messages do not unlock doctor recommendations.'
                                    : latestTriage?.urgency === 'emergency'
                                    ? 'Emergency guidance is shown above instead of booking suggestions.'
                                    : 'Doctor matches will appear here after the assistant analyses your symptoms.'}
                            </p>
                        )}
                    </section>

                    <section className="rounded-[24px] border border-slate-200 bg-white p-4">
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Recommended Slots</p>
                        {canBook ? (
                            <div className="mt-4 space-y-3">
                                {latestRecommendations.slotRecommendations.map((slot) => (
                                    <article key={`${slot.doctorId}-${slot.date}-${slot.timeType}`} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <p className="font-black text-slate-900">{slot.doctorName}</p>
                                                <p className="mt-1 text-sm text-primary">{slot.specialtyName}</p>
                                                <p className="mt-2 text-sm leading-6 text-slate-600">
                                                    {slot.dateLabel} at {slot.timeLabel}
                                                </p>
                                                <p className="mt-1 text-sm leading-6 text-slate-500">{slot.clinicName}</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => onBookSlot?.(slot, latestRecommendations?.prefill)}
                                                className="shrink-0 rounded-2xl bg-primary px-4 py-2 text-sm font-black text-white transition hover:bg-blue-700"
                                            >
                                                Book this slot
                                            </button>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        ) : (
                            <p className="mt-4 text-sm leading-6 text-slate-500">
                                {!hasAssessment
                                    ? 'Appointments stay hidden until the assistant has enough symptom detail to assess.'
                                    : latestTriage?.urgency === 'emergency'
                                    ? 'Booking shortcuts are hidden because this could need urgent in-person care.'
                                    : 'Recommended slot options will appear here once the assistant finds matching availability.'}
                            </p>
                        )}
                    </section>
                </aside>
            </div>
        </section>
    );
};

export default TriageCard;
