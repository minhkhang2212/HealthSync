import { screen } from '@testing-library/react';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import AdminDashboard from '../AdminDashboard';
import { renderWithProviders } from '../../utils/test-utils';
import apiClient from '../../utils/apiClient';

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
    getApiAssetBase: vi.fn(() => ''),
    default: {
        get: vi.fn(),
        post: vi.fn(() => Promise.resolve({ data: {} })),
        patch: vi.fn(() => Promise.resolve({ data: {} })),
        interceptors: {
            request: { use: vi.fn() },
            response: { use: vi.fn() }
        }
    }
}));

describe('AdminDashboard Component', () => {
    beforeEach(() => {
        apiClient.get.mockImplementation((url, options) => {
            if (url === '/admin/users') {
                return Promise.resolve({
                    data: {
                        data: [
                            { id: 1, roleId: 'R1' },
                            { id: 2, roleId: 'R2' },
                            { id: 3, roleId: 'R3' },
                        ],
                    },
                });
            }

            if (url === '/admin/bookings') {
                return Promise.resolve({
                    data: {
                        items: [
                            { id: 10, date: '2026-04-21', timeType: 'T1', patientId: 3, doctorId: 2, statusId: 'S1' },
                        ],
                        total: 1,
                        recognizedRevenueAmount: 8000,
                        recognizedRevenueCurrency: 'gbp',
                    },
                });
            }

            if (url === '/allcodes' && options?.params?.type === 'STATUS') {
                return Promise.resolve({ data: [] });
            }

            if (url === '/allcodes' && options?.params?.type === 'TIME') {
                return Promise.resolve({ data: [] });
            }

            return Promise.resolve({ data: { data: [] } });
        });
    });

    it('renders dashboard with recognized revenue from the admin bookings summary', async () => {
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
        expect(await screen.findByText('GBP 80.00')).toBeInTheDocument();
        expect(screen.getByText('Current month. Use Export Data to review previous months and download PDF reports.')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Export Data' })).toHaveAttribute('href', '/admin/revenue');
    });
});
