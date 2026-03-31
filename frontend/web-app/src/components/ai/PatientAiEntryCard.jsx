import React from 'react';
import { Link } from 'react-router-dom';

const PatientAiEntryCard = () => {
    return (
        <Link
            to="/patient/ai"
            className="group block w-full max-w-[560px] rounded-[18px] focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-200"
            aria-label="Open AI symptom checker"
        >
            <section className="relative overflow-hidden rounded-[18px] bg-[#137fec] px-4 py-2.5 text-white shadow-[0_16px_28px_-22px_rgba(19,127,236,0.32)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#0f73d8] hover:shadow-[0_20px_34px_-22px_rgba(19,127,236,0.4)] active:scale-[0.99] sm:px-5 sm:py-3">
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0)_100%)]" />

                <div className="relative grid grid-cols-[36px_minmax(0,1fr)_34px] items-center gap-3 sm:grid-cols-[38px_minmax(0,1fr)_36px]">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/12">
                        <span className="material-symbols-outlined text-[18px]">clinical_notes</span>
                    </div>
                    <div className="min-w-0 px-1 text-center">
                        <p className="text-[0.95rem] font-extrabold leading-[1.15] tracking-[-0.02em] text-white sm:text-[1.02rem]">
                            Check symptoms & get specialty recommendations
                        </p>
                    </div>
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/12 transition duration-300 group-hover:bg-white/18 group-hover:translate-x-0.5">
                        <span className="material-symbols-outlined text-[19px]">arrow_forward</span>
                    </div>
                </div>
            </section>
        </Link>
    );
};

export default PatientAiEntryCard;
