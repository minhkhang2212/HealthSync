import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import PatientDashboard from '../PatientDashboard';
import { renderWithProviders } from '../../utils/test-utils';

vi.mock('swiper/react', () => ({
    Swiper: ({ children }) => <div>{children}</div>,
    SwiperSlide: ({ children }) => <div>{children}</div>,
}));

vi.mock('swiper/modules', () => ({
    Navigation: {},
}));

vi.mock('../../utils/apiClient', () => ({
    __esModule: true,
    getApiAssetBase: vi.fn(() => ''),
    default: {
        get: vi.fn((url, options = {}) => Promise.resolve({ data: options?.params?.type ? [] : [] })),
        post: vi.fn(() => Promise.resolve({ data: {} })),
        interceptors: {
            request: { use: vi.fn() },
            response: { use: vi.fn() },
        },
    },
}));

const baseState = {
    auth: {
        user: { id: 3, name: 'Patient User', roleId: 'R3' },
        token: 'token',
        isAuthenticated: true,
        loading: false,
        error: null,
    },
    clinic: {
        clinics: [{ id: 10, name: 'London Heart Clinic', address: 'London Bridge' }],
        selectedClinic: null,
        loading: false,
        error: null,
    },
    specialty: {
        specialties: [{ id: 1, name: 'Cardiology' }],
        selectedSpecialty: null,
        loading: false,
        error: null,
    },
    doctor: {
        doctors: [{
            id: 7,
            name: 'Dr Cardio',
            image: null,
            doctor_infor: { nameClinic: 'London Heart Clinic', addressClinic: 'London Bridge' },
            doctor_clinic_specialties: [{
                specialtyId: 1,
                clinicId: 10,
                clinic: { id: 10, name: 'London Heart Clinic', address: 'London Bridge' },
                specialty: { id: 1, name: 'Cardiology' },
            }],
        }],
        selectedDoctor: null,
        availability: [],
        loading: false,
        error: null,
    },
    booking: {
        bookings: [{
            id: 22,
            doctorId: 7,
            date: '2026-03-31',
            timeType: 'T1',
            statusId: 'S1',
            patientContactEmail: 'patient@example.com',
        }],
        loading: false,
        error: null,
    },
    ai: {
        sessionId: null,
        disclaimer: '',
        messages: [],
        latestTriage: null,
        latestRecommendations: null,
        loading: false,
        initializing: false,
        error: null,
    },
};

describe('PatientDashboard', () => {
    it('shows a dedicated CTA that links to the AI page', () => {
        window.history.replaceState(null, '', '/patient');

        renderWithProviders(<PatientDashboard />, {
            preloadedState: baseState,
        });

        expect(screen.getByRole('link', { name: /Open AI symptom checker/i })).toHaveAttribute('href', '/patient/ai');
    });

    it('uses the dashboard search area as a launcher to the discover page', async () => {
        window.history.replaceState(null, '', '/patient');

        renderWithProviders(<PatientDashboard />, {
            preloadedState: baseState,
        });

        expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', { name: /Open patient discover directory/i }));

        expect(window.location.pathname).toBe('/patient/discover');
    });
});
