import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import TriageCard from '../TriageCard';
import { renderWithProviders } from '../../../utils/test-utils';

describe('TriageCard', () => {
    it('renders booking recommendations when AI has suggestions', async () => {
        const onBookSlot = vi.fn();
        const onApplyResults = vi.fn();

        renderWithProviders(
            <TriageCard onBookSlot={onBookSlot} onApplyResults={onApplyResults} />,
            {
                preloadedState: {
                    ai: {
                        sessionId: 11,
                        disclaimer: 'AI triage is advisory only.',
                        messages: [
                            { role: 'assistant', content: 'Tell me about your symptoms.' },
                            { role: 'user', content: 'I have chest tightness.' },
                        ],
                        latestTriage: {
                            urgency: 'urgent',
                            explanation: 'These symptoms need prompt review.',
                            redFlags: ['chest tightness'],
                            symptomSummary: 'Chest tightness with mild breathlessness.',
                            specialtyCandidates: [
                                { id: 1, name: 'Cardiology', confidence: 0.95, reason: 'Heart-related symptoms.' },
                            ],
                        },
                        latestRecommendations: {
                            prefill: {
                                specialtyId: 1,
                                specialtyName: 'Cardiology',
                                locationQuery: 'London',
                                reasonForVisit: 'Chest tightness with mild breathlessness.',
                                doctorId: 7,
                                date: '2026-03-30',
                                timeType: 'T1',
                            },
                            doctorRecommendations: [
                                {
                                    doctorId: 7,
                                    doctorName: 'Dr Cardio',
                                    specialtyName: 'Cardiology',
                                    clinicName: 'London Heart Clinic',
                                    reason: 'Matches Cardiology, earliest slot Mon, 30 Mar 2026 at 8:00 AM - 8:30 AM',
                                },
                            ],
                            slotRecommendations: [
                                {
                                    doctorId: 7,
                                    doctorName: 'Dr Cardio',
                                    specialtyId: 1,
                                    specialtyName: 'Cardiology',
                                    clinicName: 'London Heart Clinic',
                                    date: '2026-03-30',
                                    dateLabel: 'Mon, 30 Mar 2026',
                                    timeType: 'T1',
                                    timeLabel: '8:00 AM - 8:30 AM',
                                },
                            ],
                        },
                        loading: false,
                        initializing: false,
                        error: null,
                    },
                },
            }
        );

        expect(screen.getByText(/AI Triage Assistant/i)).toBeInTheDocument();
        expect(screen.getAllByText('Cardiology').length).toBeGreaterThan(0);
        expect(screen.getByRole('button', { name: /Book this slot/i })).toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', { name: /Use these results/i }));
        expect(onApplyResults).toHaveBeenCalled();
    });

    it('hides booking shortcuts for emergency states', () => {
        renderWithProviders(
            <TriageCard onBookSlot={vi.fn()} onApplyResults={vi.fn()} />,
            {
                preloadedState: {
                    ai: {
                        sessionId: 99,
                        disclaimer: 'AI triage is advisory only.',
                        messages: [{ role: 'assistant', content: 'Tell me about your symptoms.' }],
                        latestTriage: {
                            urgency: 'emergency',
                            explanation: 'This could need urgent in-person care now.',
                            redFlags: ['severe chest pain'],
                            symptomSummary: 'Severe chest pain and shortness of breath.',
                            specialtyCandidates: [
                                { id: 1, name: 'Cardiology', confidence: 0.98, reason: 'Acute chest symptoms.' },
                            ],
                        },
                        latestRecommendations: {
                            prefill: null,
                            doctorRecommendations: [],
                            slotRecommendations: [],
                        },
                        loading: false,
                        initializing: false,
                        error: null,
                    },
                },
            }
        );

        expect(screen.queryByRole('button', { name: /Book this slot/i })).not.toBeInTheDocument();
        expect(screen.getByText(/Booking shortcuts are hidden/i)).toBeInTheDocument();
    });
});
