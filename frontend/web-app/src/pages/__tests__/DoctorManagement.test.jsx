import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DoctorManagement from '../DoctorManagement';
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
            response: { use: vi.fn() },
        },
    },
}));

const doctors = [
    {
        id: 1,
        name: 'Dr Alice Reed',
        email: 'alice@healthsync.com',
        isActive: true,
        createdAt: '2026-04-10T09:00:00Z',
        doctor_infor: { nameClinic: 'North Medical Centre' },
        doctor_clinic_specialties: [{ clinicId: 1, specialtyId: 1 }],
    },
    {
        id: 2,
        name: 'Dr Ben Stone',
        email: 'ben@healthsync.com',
        isActive: false,
        createdAt: '2026-04-11T09:00:00Z',
        doctor_infor: { nameClinic: 'South Skin Clinic' },
        doctor_clinic_specialties: [{ clinicId: 2, specialtyId: 2 }],
    },
    {
        id: 3,
        name: 'Dr Cara Mills',
        email: 'cara@healthsync.com',
        isActive: true,
        createdAt: '2026-04-12T09:00:00Z',
        doctor_infor: { nameClinic: 'Central Neuro Hub' },
        doctor_clinic_specialties: [{ clinicId: 3, specialtyId: 3 }],
    },
    {
        id: 4,
        name: 'Dr Noah Singh',
        email: 'noah@healthsync.com',
        isActive: true,
        createdAt: '2026-04-13T09:00:00Z',
        doctor_infor: { nameClinic: 'North Medical Centre' },
        doctor_clinic_specialties: [{ clinicId: 1, specialtyId: 1 }],
    },
    {
        id: 5,
        name: 'Dr Eva Grant',
        email: 'eva@healthsync.com',
        isActive: true,
        createdAt: '2026-04-14T09:00:00Z',
        doctor_infor: { nameClinic: 'South Skin Clinic' },
        doctor_clinic_specialties: [{ clinicId: 2, specialtyId: 2 }],
    },
];

const renderPage = () =>
    renderWithProviders(<DoctorManagement />, {
        preloadedState: {
            auth: {
                user: { name: 'Admin Test User', roleId: 'R1' },
                isAuthenticated: true,
            },
            clinic: {
                clinics: [
                    { id: 1, name: 'North Medical Centre' },
                    { id: 2, name: 'South Skin Clinic' },
                    { id: 3, name: 'Central Neuro Hub' },
                ],
                loading: false,
            },
            specialty: {
                specialties: [
                    { id: 1, name: 'Cardiology' },
                    { id: 2, name: 'Dermatology' },
                    { id: 3, name: 'Neurology' },
                ],
                loading: false,
            },
            doctor: {
                doctors,
                loading: false,
                error: null,
                selectedDoctor: null,
                availability: [],
            },
        },
    });

describe('DoctorManagement page', () => {
    beforeEach(() => {
        apiClient.get.mockReset();
        apiClient.post.mockReset();
        apiClient.patch.mockReset();
        apiClient.get.mockImplementation((url) => {
            if (url === '/allcodes') {
                return Promise.resolve({ data: [] });
            }
            return Promise.resolve({ data: [] });
        });
        apiClient.post.mockResolvedValue({ data: { id: 99, name: 'Dr New Account' } });
        apiClient.patch.mockResolvedValue({ data: {} });
        vi.stubGlobal('confirm', vi.fn(() => true));
    });

    it('renders the full doctor list newest first with the new admin navigation', async () => {
        renderPage();

        expect(screen.getByRole('heading', { name: 'Doctors' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /Dashboard/ })).toHaveAttribute('href', '/admin/dashboard');
        expect(screen.getByRole('link', { name: /Bookings/ })).toHaveAttribute('href', '/admin/bookings');

        const table = screen.getByTestId('doctor-management-table');
        const rows = within(table).getAllByRole('row');

        expect(rows).toHaveLength(6);
        expect(within(rows[1]).getByText('Dr Eva Grant')).toBeInTheDocument();
        expect(within(rows[2]).getByText('Dr Noah Singh')).toBeInTheDocument();
        expect(within(rows[3]).getByText('Dr Cara Mills')).toBeInTheDocument();
        expect(within(rows[4]).getByText('Dr Ben Stone')).toBeInTheDocument();
        expect(within(rows[5]).getByText('Dr Alice Reed')).toBeInTheDocument();
    });

    it('filters doctors by search, clinic, specialty, and status together', async () => {
        const user = userEvent.setup();

        renderPage();

        await user.type(screen.getByPlaceholderText('Search doctors by name, email, clinic, specialty...'), 'ben@healthsync.com');
        await user.selectOptions(screen.getByLabelText('Clinic'), '2');
        await user.selectOptions(screen.getByLabelText('Specialty'), '2');
        await user.selectOptions(screen.getByLabelText('Status'), 'inactive');

        const table = screen.getByTestId('doctor-management-table');
        const rows = within(table).getAllByRole('row');

        expect(rows).toHaveLength(2);
        expect(screen.getByText('Dr Ben Stone')).toBeInTheDocument();
        expect(screen.queryByText('Dr Eva Grant')).not.toBeInTheDocument();
        expect(screen.getByText('Showing 1 of 5 doctors.')).toBeInTheDocument();
    });

    it('keeps edit and toggle actions, and still opens the new doctor flow', async () => {
        const user = userEvent.setup();

        renderPage();

        await user.click(screen.getAllByRole('button', { name: 'Edit Profile' })[0]);
        expect(await screen.findByRole('heading', { name: 'Edit Doctor Profile' })).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Cancel' }));

        await user.click(screen.getAllByRole('button', { name: 'Set Inactive' })[0]);
        expect(global.confirm).toHaveBeenCalled();
        expect(apiClient.patch).toHaveBeenCalledWith('/admin/doctors/5', { isActive: false });

        await user.click(screen.getByRole('button', { name: 'New Doctor' }));
        expect(await screen.findByRole('heading', { name: 'Add New Doctor' })).toBeInTheDocument();
    });
});
