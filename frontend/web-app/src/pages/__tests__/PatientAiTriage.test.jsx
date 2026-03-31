import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import PatientAiTriage from '../PatientAiTriage';
import { renderWithProviders } from '../../utils/test-utils';

describe('PatientAiTriage', () => {
    it('renders the dedicated AI workspace and routes recommendations back to the dashboard', async () => {
        window.history.replaceState(null, '', '/patient/ai');

        renderWithProviders(<PatientAiTriage />, {
            preloadedState: {
                auth: {
                    user: { id: 3, name: 'Alex Smith', roleId: 'R3' },
                    token: 'token',
                    isAuthenticated: true,
                    loading: false,
                    error: null,
                },
                ai: {
                    sessionId: 11,
                    disclaimer: 'AI triage is advisory only.',
                    messages: [
                        { role: 'assistant', content: 'Tell me about your symptoms.' },
                        { role: 'user', content: 'I have chest tightness near London Bridge.' },
                    ],
                    latestTriage: {
                        urgency: 'urgent',
                        explanation: 'Prompt review is sensible.',
                        redFlags: ['chest tightness'],
                        symptomSummary: 'Chest tightness near London Bridge.',
                        specialtyCandidates: [
                            { id: 1, name: 'Cardiology', confidence: 0.95, reason: 'Heart-related symptoms.' },
                        ],
                    },
                    latestRecommendations: {
                        prefill: {
                            specialtyId: 1,
                            specialtyName: 'Cardiology',
                            locationQuery: 'London Bridge',
                            reasonForVisit: 'Chest tightness near London Bridge.',
                            doctorId: 7,
                            date: '2026-04-01',
                            timeType: 'T1',
                        },
                        doctorRecommendations: [
                            {
                                doctorId: 7,
                                doctorName: 'Dr Cardio',
                                specialtyName: 'Cardiology',
                                clinicName: 'London Heart Clinic',
                                reason: 'Strong specialty match.',
                            },
                        ],
                        slotRecommendations: [],
                    },
                    loading: false,
                    initializing: false,
                    error: null,
                },
            },
        });

        expect(screen.getByText(/HealthAI Assistant/i)).toBeInTheDocument();
        expect(screen.getByText(/Diagnostic Interface/i)).toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', { name: /View All Specialists/i }));

        expect(window.location.pathname).toBe('/patient');
        expect(window.history.state.usr.aiPrefill.specialtyName).toBe('Cardiology');
    });

    it('keeps the right column neutral for greeting-only chat', () => {
        window.history.replaceState(null, '', '/patient/ai');

        renderWithProviders(<PatientAiTriage />, {
            preloadedState: {
                auth: {
                    user: { id: 3, name: 'Alex Smith', roleId: 'R3' },
                    token: 'token',
                    isAuthenticated: true,
                    loading: false,
                    error: null,
                },
                ai: {
                    sessionId: 11,
                    disclaimer: 'AI triage is advisory only.',
                    messages: [
                        { role: 'assistant', content: 'Tell me about your symptoms.' },
                        { role: 'user', content: 'Hello' },
                    ],
                    latestTriage: {
                        readyForAssessment: false,
                        needsMoreInformation: true,
                        urgency: null,
                        explanation: '',
                        redFlags: [],
                        symptomSummary: '',
                        specialtyCandidates: [],
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
        });

        expect(screen.getByText(/No assessment yet/i)).toBeInTheDocument();
        expect(screen.getByText(/Describe real symptoms and timing before specialty matches appear here/i)).toBeInTheDocument();
        expect(screen.getByText(/Greeting messages alone do not unlock doctor recommendations/i)).toBeInTheDocument();
        expect(screen.queryByText(/Urgent/i)).not.toBeInTheDocument();
    });
});
