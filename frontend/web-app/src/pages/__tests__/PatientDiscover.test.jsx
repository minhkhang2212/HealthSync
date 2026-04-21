import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PatientDiscover from '../PatientDiscover';
import { renderWithProviders } from '../../utils/test-utils';
import { DISCOVER_RECENT_QUERIES_KEY } from '../../utils/discoverSearchHistory';

vi.mock('../../utils/apiClient', () => ({
    __esModule: true,
    getApiAssetBase: vi.fn(() => ''),
    default: {
        get: vi.fn(() => Promise.resolve({ data: [] })),
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
            { id: 10, name: 'London Heart Clinic', address: 'London Bridge', description: 'Cardiac diagnostics and specialist reviews.' },
            { id: 11, name: 'Family First Medical Centre', address: 'Baker Street, London', description: 'Family-focused outpatient care.' },
            { id: 12, name: 'Manchester Neuro Hub', address: 'Manchester', description: 'Neurology-led consultations and follow-up care.' },
        ],
        selectedClinic: null,
        loading: false,
        error: null,
    },
    specialty: {
        specialties: [
            { id: 1, name: 'Cardiology', description: 'Heart checks and specialist treatment planning.' },
            { id: 2, name: 'Neurology', description: 'Brain, nerve, and balance assessments.' },
            { id: 3, name: 'Pediatrics', description: 'Children and family care.' },
            { id: 4, name: 'Dermatology', description: 'Skin health and chronic rash support.' },
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
                email: 'cardio@example.com',
                phoneNumber: '111111',
                image: null,
                doctor_infor: {
                    nameClinic: 'London Heart Clinic',
                    addressClinic: 'London Bridge',
                    note: 'Fast cardiac assessments for chest pain and blood pressure concerns.',
                },
                doctor_clinic_specialties: [
                    {
                        specialtyId: 1,
                        clinicId: 10,
                        clinic: { id: 10, name: 'London Heart Clinic', address: 'London Bridge' },
                        specialty: { id: 1, name: 'Cardiology' },
                    },
                    {
                        specialtyId: 1,
                        clinicId: 11,
                        clinic: { id: 11, name: 'Family First Medical Centre', address: 'Baker Street, London' },
                        specialty: { id: 1, name: 'Cardiology' },
                    },
                ],
            },
            {
                id: 8,
                name: 'Dr Family',
                email: 'family@example.com',
                phoneNumber: '222222',
                image: '/doctor-family.png',
                doctor_infor: {
                    nameClinic: 'Family First Medical Centre',
                    addressClinic: 'Baker Street, London',
                    note: 'Practical pediatric support for same-day family appointments.',
                },
                doctor_clinic_specialties: [
                    {
                        specialtyId: 3,
                        clinicId: 11,
                        clinic: { id: 11, name: 'Family First Medical Centre', address: 'Baker Street, London' },
                        specialty: { id: 3, name: 'Pediatrics' },
                    },
                ],
            },
            {
                id: 9,
                name: 'Dr Neuro',
                email: 'neuro@example.com',
                image: null,
                doctor_infor: {
                    nameClinic: 'Manchester Neuro Hub',
                    addressClinic: 'Manchester',
                    note: 'Neurology reviews for headaches, numbness, and balance changes.',
                },
                doctor_clinic_specialties: [
                    {
                        specialtyId: 2,
                        clinicId: 12,
                        clinic: { id: 12, name: 'Manchester Neuro Hub', address: 'Manchester' },
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

describe('PatientDiscover', () => {
    beforeEach(() => {
        window.localStorage.clear();
    });

    it('renders the shared layout, loads recent searches, and caps the default sections', () => {
        window.localStorage.setItem(DISCOVER_RECENT_QUERIES_KEY, JSON.stringify(['Cardiology', 'Family care']));
        window.history.replaceState(null, '', '/patient/discover');

        renderWithProviders(<PatientDiscover />, {
            preloadedState,
        });

        expect(screen.getByText(/Quick Search & Discovery/i)).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /Top Specialties/i })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /Medical Facilities/i })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /Featured Doctors/i })).toBeInTheDocument();
        expect(screen.getByText('Family care')).toBeInTheDocument();

        expect(screen.getAllByText('Neurology').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Pediatrics').length).toBeGreaterThan(0);
        expect(screen.queryAllByText('Dermatology')).toHaveLength(0);

        expect(screen.getAllByText('Family First Medical Centre').length).toBeGreaterThan(0);
        expect(screen.getAllByText('London Heart Clinic').length).toBeGreaterThan(0);
        expect(screen.queryAllByText('Manchester Neuro Hub')).toHaveLength(0);

        expect(screen.getByText('Dr Cardio')).toBeInTheDocument();
        expect(screen.getByText('Dr Family')).toBeInTheDocument();
        expect(screen.queryByText('Dr Neuro')).not.toBeInTheDocument();
    });

    it('filters live, saves submitted queries, and manages recent search chips', async () => {
        window.history.replaceState(null, '', '/patient/discover');

        renderWithProviders(<PatientDiscover />, {
            preloadedState,
        });

        const input = screen.getByRole('searchbox', { name: /Search specialty, doctor, or clinic/i });

        await userEvent.type(input, 'Neuro');

        expect(screen.getAllByText('Neurology').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Manchester Neuro Hub').length).toBeGreaterThan(0);
        expect(screen.getByText('Dr Neuro')).toBeInTheDocument();
        expect(screen.queryAllByText('Cardiology')).toHaveLength(0);

        await userEvent.click(screen.getByRole('button', { name: /^Search$/i }));

        expect(screen.getByRole('button', { name: /^Neuro$/i })).toBeInTheDocument();
        expect(JSON.parse(window.localStorage.getItem(DISCOVER_RECENT_QUERIES_KEY))).toEqual(['Neuro']);

        await userEvent.clear(input);
        await userEvent.type(input, 'Cardio');
        await userEvent.click(screen.getByRole('button', { name: /^Search$/i }));

        expect(screen.getByRole('button', { name: /^Cardio$/i })).toBeInTheDocument();
        expect(JSON.parse(window.localStorage.getItem(DISCOVER_RECENT_QUERIES_KEY))).toEqual(['Cardio', 'Neuro']);

        await userEvent.click(screen.getByRole('button', { name: /^Neuro$/i }));

        expect(screen.getByRole('searchbox', { name: /Search specialty, doctor, or clinic/i })).toHaveValue('Neuro');
        expect(screen.getByText('Dr Neuro')).toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', { name: /Remove recent search Neuro/i }));
        expect(screen.queryByRole('button', { name: /^Neuro$/i })).not.toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', { name: /Clear All/i }));
        expect(screen.queryByRole('button', { name: /^Cardio$/i })).not.toBeInTheDocument();
        expect(window.localStorage.getItem(DISCOVER_RECENT_QUERIES_KEY)).toBeNull();
    });
});
