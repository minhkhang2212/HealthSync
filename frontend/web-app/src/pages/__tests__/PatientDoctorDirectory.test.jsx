import React from 'react';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PatientDoctorDirectory from '../PatientDoctorDirectory';
import { renderWithProviders } from '../../utils/test-utils';

vi.mock('../../utils/apiClient', () => ({
    __esModule: true,
    getApiAssetBase: vi.fn(() => ''),
    default: {
        get: vi.fn((url, options = {}) => {
            if (options?.params?.type === 'PRICE') {
                return Promise.resolve({
                    data: [
                        { key: 'PRI1', valueEn: '120 GBP' },
                        { key: 'PRI2', valueEn: '150 GBP' },
                    ],
                });
            }

            return Promise.resolve({ data: [] });
        }),
        post: vi.fn(() => Promise.resolve({ data: {} })),
        interceptors: {
            request: { use: vi.fn() },
            response: { use: vi.fn() },
        },
    },
}));

const preloadedState = {
    auth: {
        user: { id: 3, name: 'Patient User', roleId: 'R3' },
        token: 'token',
        isAuthenticated: true,
        loading: false,
        error: null,
    },
    clinic: {
        clinics: [
            { id: 10, name: 'London Heart Clinic', address: 'London Bridge' },
            { id: 11, name: 'Manchester Neuro Hub', address: 'Manchester' },
        ],
        selectedClinic: null,
        loading: false,
        error: null,
    },
    specialty: {
        specialties: [
            { id: 1, name: 'Cardiology' },
            { id: 2, name: 'Neurology' },
        ],
        selectedSpecialty: null,
        loading: false,
        error: null,
    },
    doctor: {
        doctors: [
            {
                id: 7,
                name: 'Dr Cardio',
                gender: 'M',
                image: null,
                doctor_infor: {
                    nameClinic: 'London Heart Clinic',
                    addressClinic: 'London Bridge',
                    note: 'Heart specialist with rapid availability.',
                    priceId: 'PRI1',
                    nextAvailable: 'Today',
                },
                doctor_clinic_specialties: [
                    {
                        specialtyId: 1,
                        clinicId: 10,
                        clinic: { id: 10, name: 'London Heart Clinic', address: 'London Bridge' },
                        specialty: { id: 1, name: 'Cardiology' },
                    },
                ],
            },
            {
                id: 8,
                name: 'Dr Neuro',
                gender: 'F',
                image: null,
                doctor_infor: {
                    nameClinic: 'Manchester Neuro Hub',
                    addressClinic: 'Manchester',
                    note: 'Neurology specialist for complex cases.',
                    priceId: 'PRI2',
                    nextAvailable: 'Tomorrow',
                },
                doctor_clinic_specialties: [
                    {
                        specialtyId: 2,
                        clinicId: 11,
                        clinic: { id: 11, name: 'Manchester Neuro Hub', address: 'Manchester' },
                        specialty: { id: 2, name: 'Neurology' },
                    },
                ],
            },
        ],
        selectedDoctor: null,
        availability: [],
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

describe('PatientDoctorDirectory', () => {
    it('applies dashboard filters passed through navigation state', async () => {
        window.history.replaceState({
            usr: {
                initialFilters: {
                    specialtyId: 1,
                    location: 'London',
                },
            },
            key: 'doctor-directory',
            idx: 0,
        }, '', '/patient/doctors');

        renderWithProviders(<PatientDoctorDirectory />, {
            preloadedState,
        });

        expect(await screen.findByText(/Dashboard Filters Applied/i)).toBeInTheDocument();
        expect(screen.getByDisplayValue('London')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /Dr Cardio/i })).toBeInTheDocument();
        expect(screen.queryByText(/Dr Neuro/i)).not.toBeInTheDocument();
    });
});
