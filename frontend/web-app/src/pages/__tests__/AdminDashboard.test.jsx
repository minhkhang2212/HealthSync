import { screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AdminDashboard from '../AdminDashboard';
import { renderWithProviders } from '../../utils/test-utils';

vi.mock('../../store/slices/clinicSlice', async () => {
    const actual = await vi.importActual('../../store/slices/clinicSlice');
    return {
        ...actual,
        fetchClinics: () => ({ type: 'clinic/fetchClinics' }),
    };
});

vi.mock('../../store/slices/specialtySlice', async () => {
    const actual = await vi.importActual('../../store/slices/specialtySlice');
    return {
        ...actual,
        fetchSpecialties: () => ({ type: 'specialty/fetchSpecialties' }),
    };
});

vi.mock('../../store/slices/doctorSlice', async () => {
    const actual = await vi.importActual('../../store/slices/doctorSlice');
    return {
        ...actual,
        fetchDoctors: () => ({ type: 'doctor/fetchDoctors' }),
    };
});

vi.mock('../../utils/apiClient', () => ({
    __esModule: true,
    default: {
        get: vi.fn(() => Promise.resolve({ data: { data: [] } })),
        post: vi.fn(() => Promise.resolve({ data: {} })),
        interceptors: {
            request: { use: vi.fn() },
            response: { use: vi.fn() }
        }
    }
}));

describe('AdminDashboard Component', () => {
    it('renders dashboard with user name and stats', () => {
        const preloadedState = {
            auth: {
                user: { name: 'Admin Test User', roleId: 'R1' },
                isAuthenticated: true,
            },
            clinic: {
                clinics: [{ id: 1 }, { id: 2 }, { id: 3 }],
                loading: false,
            },
            specialty: {
                specialties: [{ id: 1 }, { id: 2 }],
                loading: false,
            }
        };

        renderWithProviders(<AdminDashboard />, { preloadedState });

        // Check Header username
        expect(screen.getByText('Admin Test User')).toBeInTheDocument();

        // Check derived stats
        expect(screen.getByText('Active Clinics')).toBeInTheDocument();
    });
});
