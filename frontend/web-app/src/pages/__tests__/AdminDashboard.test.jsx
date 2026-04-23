import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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
            response: { use: vi.fn() },
        },
    },
}));

const createMonthlyRevenueItem = (month, recognizedRevenueAmount, recognizedRevenueCurrency = 'gbp') => {
    const parsed = new Date(`${month}-01T00:00:00`);

    return {
        month,
        label: Number.isNaN(parsed.getTime())
            ? month
            : parsed.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
        recognizedRevenueAmount,
        recognizedRevenueCurrency,
    };
};

const baseMonthlyRevenueItems = [
    createMonthlyRevenueItem('2026-04', 8000),
    createMonthlyRevenueItem('2026-03', 7200),
    createMonthlyRevenueItem('2026-02', 6100),
    createMonthlyRevenueItem('2026-01', 5000),
    createMonthlyRevenueItem('2025-12', 4300),
    createMonthlyRevenueItem('2025-11', 3900),
    createMonthlyRevenueItem('2025-10', 2800),
];

const baseDoctors = [
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

const baseBookings = [
    {
        id: 201,
        createdAt: '2026-04-21T15:00:00Z',
        date: '2026-04-25',
        timeType: 'T2',
        patientId: 11,
        doctorId: 5,
        statusId: 'S1',
        patient: { name: 'Patient Latest', email: 'patient.latest@example.com' },
        doctor: { name: 'Dr Eva Grant', email: 'eva@healthsync.com' },
    },
    {
        id: 202,
        createdAt: '2026-04-20T15:00:00Z',
        date: '2026-04-24',
        timeType: 'T3',
        patientId: 12,
        doctorId: 4,
        statusId: 'S2',
        patient: { name: 'Patient Recent', email: 'patient.recent@example.com' },
        doctor: { name: 'Dr Noah Singh', email: 'noah@healthsync.com' },
    },
    {
        id: 203,
        createdAt: '2026-04-19T15:00:00Z',
        date: '2026-04-23',
        timeType: 'T1',
        patientId: 13,
        doctorId: 3,
        statusId: 'S3',
        patient: { name: 'Patient Third', email: 'patient.third@example.com' },
        doctor: { name: 'Dr Cara Mills', email: 'cara@healthsync.com' },
    },
    {
        id: 204,
        createdAt: '2026-04-18T15:00:00Z',
        date: '2026-04-22',
        timeType: 'T4',
        patientId: 14,
        doctorId: 2,
        statusId: 'S1',
        patient: { name: 'Patient Fourth', email: 'patient.fourth@example.com' },
        doctor: { name: 'Dr Ben Stone', email: 'ben@healthsync.com' },
    },
    {
        id: 205,
        createdAt: '2026-04-17T15:00:00Z',
        date: '2026-04-21',
        timeType: 'T5',
        patientId: 15,
        doctorId: 1,
        statusId: 'S1',
        patient: { name: 'Patient Oldest', email: 'patient.oldest@example.com' },
        doctor: { name: 'Dr Alice Reed', email: 'alice@healthsync.com' },
    },
];

const createApiGetMock = ({
    monthlyRevenueItems = baseMonthlyRevenueItems,
    monthlyRevenueError = null,
    bookings = baseBookings,
} = {}) => (url, options) => {
    if (url === '/admin/users') {
        return Promise.resolve({
            data: {
                data: [
                    { id: 1, roleId: 'R1' },
                    { id: 2, roleId: 'R2' },
                    { id: 3, roleId: 'R2' },
                    { id: 4, roleId: 'R3' },
                ],
            },
        });
    }

    if (url === '/admin/bookings') {
        return Promise.resolve({
            data: {
                items: bookings,
                total: bookings.length,
                recognizedRevenueAmount: 8000,
                recognizedRevenueCurrency: 'gbp',
            },
        });
    }

    if (url === '/admin/revenue/monthly') {
        if (monthlyRevenueError) {
            return Promise.reject({
                response: {
                    data: {
                        message: monthlyRevenueError,
                    },
                },
            });
        }

        return Promise.resolve({
            data: {
                items: monthlyRevenueItems,
                currentMonth: '2026-04',
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
};

const renderDashboard = () => {
    window.history.pushState({}, '', '/admin/dashboard');

    const preloadedState = {
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
            doctors: baseDoctors,
            loading: false,
            error: null,
            selectedDoctor: null,
            availability: [],
        },
    };

    return renderWithProviders(<AdminDashboard />, { preloadedState });
};

describe('AdminDashboard Component', () => {
    beforeEach(() => {
        window.history.pushState({}, '', '/');
        apiClient.get.mockReset();
        apiClient.get.mockImplementation(createApiGetMock());
    });

    it('renders compact doctor and booking previews with the new admin menu links', async () => {
        renderDashboard();

        expect(await screen.findByText('Admin Test User')).toBeInTheDocument();
        const adminNav = screen.getByRole('complementary');
        expect(within(adminNav).getByRole('link', { name: /Doctors/ })).toHaveAttribute('href', '/admin/doctors');
        expect(within(adminNav).getByRole('link', { name: /Bookings/ })).toHaveAttribute('href', '/admin/bookings');
        expect(screen.getByRole('link', { name: 'View Full Doctors' })).toHaveAttribute('href', '/admin/doctors');
        expect(screen.getByRole('link', { name: 'View Full Bookings' })).toHaveAttribute('href', '/admin/bookings');

        const doctorTable = screen.getByTestId('dashboard-doctors-preview-table');
        const doctorRows = within(doctorTable).getAllByRole('row');
        expect(doctorRows).toHaveLength(5);
        expect(within(doctorRows[1]).getByText('Dr Eva Grant')).toBeInTheDocument();
        expect(within(doctorRows[2]).getByText('Dr Noah Singh')).toBeInTheDocument();
        expect(within(doctorRows[3]).getByText('Dr Cara Mills')).toBeInTheDocument();
        expect(within(doctorRows[4]).getByText('Dr Ben Stone')).toBeInTheDocument();
        expect(screen.queryByText('Dr Alice Reed')).not.toBeInTheDocument();

        const bookingCards = await screen.findAllByTestId(/dashboard-booking-/);
        expect(bookingCards).toHaveLength(3);
        expect(within(bookingCards[0]).getByText('Patient: Patient Latest')).toBeInTheDocument();
        expect(within(bookingCards[1]).getByText('Patient: Patient Recent')).toBeInTheDocument();
        expect(within(bookingCards[2]).getByText('Patient: Patient Third')).toBeInTheDocument();
        expect(screen.queryByText('Patient: Patient Oldest')).not.toBeInTheDocument();
    });

    it('moves to the new doctor management page when View Full Doctors is clicked', async () => {
        const user = userEvent.setup();

        renderDashboard();

        await user.click(screen.getByRole('link', { name: 'View Full Doctors' }));

        expect(window.location.pathname).toBe('/admin/doctors');
    });

    it('renders the latest 6 months of revenue and highlights the current month', async () => {
        renderDashboard();

        expect(screen.getByText('Active Clinics')).toBeInTheDocument();
        expect(await screen.findByText('GBP 80.00')).toBeInTheDocument();
        expect(screen.getByText('Current month. Use Export Data to review previous months and download PDF reports.')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Export Data' })).toHaveAttribute('href', '/admin/revenue');
        expect(screen.getByText('Last 6 months of recognized consultation revenue.')).toBeInTheDocument();

        const chart = await screen.findByTestId('consultation-revenue-chart');
        const bars = within(chart).getAllByRole('img');

        expect(chart).toHaveClass('items-stretch');
        expect(bars.map((bar) => bar.getAttribute('data-month'))).toEqual([
            '2025-11',
            '2025-12',
            '2026-01',
            '2026-02',
            '2026-03',
            '2026-04',
        ]);
        expect(screen.queryByText('Mon')).not.toBeInTheDocument();
        expect(screen.queryByText('Oct')).not.toBeInTheDocument();
        expect(screen.getByTestId('revenue-bar-2026-04')).toHaveAttribute('data-current-month', 'true');
        expect(screen.getByTestId('revenue-bar-fill-2026-04')).toHaveStyle({ height: '100%' });
    });

    it('shows the month and amount when hovering a revenue bar', async () => {
        const user = userEvent.setup();

        renderDashboard();

        const aprilBar = await screen.findByTestId('revenue-bar-2026-04');
        expect(screen.queryByTestId('revenue-tooltip-2026-04')).not.toBeInTheDocument();

        await user.hover(aprilBar);

        const tooltip = await screen.findByTestId('revenue-tooltip-2026-04');
        expect(tooltip).toHaveTextContent('April 2026');
        expect(tooltip).toHaveTextContent('GBP 80.00');

        await user.unhover(aprilBar);

        expect(screen.queryByTestId('revenue-tooltip-2026-04')).not.toBeInTheDocument();
    });

    it('fills missing months up to the latest 6 months when the API returns a shorter history', async () => {
        apiClient.get.mockImplementation(createApiGetMock({
            monthlyRevenueItems: [
                createMonthlyRevenueItem('2026-04', 8000),
                createMonthlyRevenueItem('2026-03', 5000),
                createMonthlyRevenueItem('2026-02', 3500),
            ],
        }));

        renderDashboard();

        const chart = await screen.findByTestId('consultation-revenue-chart');
        const bars = within(chart).getAllByRole('img');

        expect(bars.map((bar) => bar.getAttribute('data-month'))).toEqual([
            '2025-11',
            '2025-12',
            '2026-01',
            '2026-02',
            '2026-03',
            '2026-04',
        ]);
        expect(screen.getByTestId('revenue-bar-fill-2025-11')).toHaveStyle({ height: '0%' });
        expect(screen.getByText('Nov')).toBeInTheDocument();
    });

    it('keeps zero-revenue months visible when other months still have revenue', async () => {
        apiClient.get.mockImplementation(createApiGetMock({
            monthlyRevenueItems: [
                createMonthlyRevenueItem('2026-04', 8000),
                createMonthlyRevenueItem('2026-03', 0),
                createMonthlyRevenueItem('2026-02', 4100),
            ],
        }));

        renderDashboard();

        await screen.findByTestId('consultation-revenue-chart');

        expect(screen.getByText('Mar')).toBeInTheDocument();
        expect(screen.getByTestId('revenue-bar-fill-2026-03')).toHaveStyle({ height: '0%' });
    });

    it('shows a chart error without breaking the rest of the dashboard', async () => {
        apiClient.get.mockImplementation(createApiGetMock({
            monthlyRevenueError: 'Revenue trend unavailable right now.',
        }));

        renderDashboard();

        expect(await screen.findByText('GBP 80.00')).toBeInTheDocument();
        expect(screen.getByText('Booking Management')).toBeInTheDocument();
        expect(await screen.findByTestId('consultation-revenue-error')).toHaveTextContent('Revenue trend unavailable right now.');
        expect(screen.queryByTestId('consultation-revenue-chart')).not.toBeInTheDocument();
    });

    it('still renders all 6 months when the latest 6 months have no recognized revenue', async () => {
        apiClient.get.mockImplementation(createApiGetMock({
            monthlyRevenueItems: [
                createMonthlyRevenueItem('2026-04', 0),
                createMonthlyRevenueItem('2026-03', 0),
                createMonthlyRevenueItem('2026-02', 0),
                createMonthlyRevenueItem('2026-01', 0),
                createMonthlyRevenueItem('2025-12', 0),
                createMonthlyRevenueItem('2025-11', 0),
            ],
        }));

        renderDashboard();

        const chart = await screen.findByTestId('consultation-revenue-chart');
        const bars = within(chart).getAllByRole('img');

        expect(bars.map((bar) => bar.getAttribute('data-month'))).toEqual([
            '2025-11',
            '2025-12',
            '2026-01',
            '2026-02',
            '2026-03',
            '2026-04',
        ]);
        expect(screen.queryByTestId('consultation-revenue-empty')).not.toBeInTheDocument();
        expect(screen.getByTestId('revenue-bar-fill-2026-04')).toHaveStyle({ height: '0%' });
        expect(screen.getByText('Apr')).toBeInTheDocument();
    });
});
