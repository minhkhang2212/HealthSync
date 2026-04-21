import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

const createApiGetMock = ({
    monthlyRevenueItems = baseMonthlyRevenueItems,
    monthlyRevenueError = null,
} = {}) => (url, options) => {
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
        },
    };

    return renderWithProviders(<AdminDashboard />, { preloadedState });
};

describe('AdminDashboard Component', () => {
    beforeEach(() => {
        apiClient.get.mockReset();
        apiClient.get.mockImplementation(createApiGetMock());
    });

    it('renders the latest 6 months of revenue and highlights the current month', async () => {
        renderDashboard();

        expect(screen.getByText('Admin Test User')).toBeInTheDocument();
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
        expect(screen.getByTestId('revenue-bar-2026-04')).toHaveClass('h-full');
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
