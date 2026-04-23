import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import BookingManagement from '../BookingManagement';
import { renderWithProviders } from '../../utils/test-utils';
import apiClient from '../../utils/apiClient';

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

const bookings = [
    {
        id: 401,
        createdAt: '2026-04-21T15:00:00Z',
        date: '2026-04-28',
        timeType: 'T1',
        statusId: 'S1',
        paymentMethod: 'stripe',
        paymentStatus: 'paid',
        paymentAmount: 8000,
        paymentCurrency: 'gbp',
        bookingDetails: { reason: 'Chest pain follow-up' },
        patientContactEmail: 'liam.contact@example.com',
        patient: { name: 'Liam Stone', email: 'liam@example.com' },
        doctorId: 5,
        doctor: { name: 'Dr Eva Grant', email: 'eva@healthsync.com' },
    },
    {
        id: 402,
        createdAt: '2026-04-20T14:00:00Z',
        date: '2026-04-18',
        timeType: 'T2',
        statusId: 'S2',
        paymentMethod: 'pay_at_clinic',
        paymentStatus: 'pending',
        paymentAmount: null,
        paymentCurrency: 'gbp',
        bookingDetails: { reason: 'Dermatology review' },
        patientContactEmail: 'mia.contact@example.com',
        patient: { name: 'Mia Frost', email: 'mia@example.com' },
        doctorId: 4,
        doctor: { name: 'Dr Noah Singh', email: 'noah@healthsync.com' },
    },
    {
        id: 403,
        createdAt: '2026-04-19T13:00:00Z',
        date: '2026-04-15',
        timeType: 'T3',
        statusId: 'S3',
        paymentMethod: 'stripe',
        paymentStatus: 'paid',
        paymentAmount: 6500,
        paymentCurrency: 'gbp',
        bookingDetails: { reason: 'Neurology consult' },
        patientContactEmail: 'casey.billing@example.com',
        patient: { name: 'Casey Rowe', email: 'casey@example.com' },
        doctorId: 3,
        doctor: { name: 'Dr Ben Stone', email: 'ben@healthsync.com' },
    },
    {
        id: 404,
        createdAt: '2026-04-18T12:00:00Z',
        date: '2026-04-10',
        timeType: 'T4',
        statusId: 'S1',
        confirmedAt: '2026-04-18T12:30:00Z',
        paymentMethod: 'pay_at_clinic',
        paymentStatus: 'pending',
        paymentAmount: null,
        paymentCurrency: 'gbp',
        bookingDetails: { reason: 'Confirmed follow-up' },
        patientContactEmail: 'zara.contact@example.com',
        patient: { name: 'Zara Quinn', email: 'zara@example.com' },
        doctorId: 2,
        doctor: { name: 'Dr Cara Mills', email: 'cara@healthsync.com' },
    },
];

const renderPage = () =>
    renderWithProviders(<BookingManagement />, {
        preloadedState: {
            auth: {
                user: { name: 'Admin Test User', roleId: 'R1' },
                isAuthenticated: true,
            },
        },
    });

describe('BookingManagement page', () => {
    beforeEach(() => {
        apiClient.get.mockReset();
        apiClient.get.mockImplementation((url, options) => {
            if (url === '/admin/bookings') {
                return Promise.resolve({
                    data: {
                        items: bookings,
                        total: bookings.length,
                    },
                });
            }

            if (url === '/allcodes' && options?.params?.type === 'STATUS') {
                return Promise.resolve({ data: [] });
            }

            if (url === '/allcodes' && options?.params?.type === 'TIME') {
                return Promise.resolve({ data: [] });
            }

            return Promise.resolve({ data: [] });
        });
    });

    it('renders all admin bookings newest first from the local API fetch', async () => {
        renderPage();

        expect(await screen.findByRole('heading', { name: 'Bookings' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /Doctors/ })).toHaveAttribute('href', '/admin/doctors');
        expect(screen.getByText('Total in feed: 4')).toBeInTheDocument();

        const table = await screen.findByTestId('booking-management-table');
        const rows = within(table).getAllByRole('row');

        expect(rows).toHaveLength(5);
        expect(within(rows[1]).getByText('#401')).toBeInTheDocument();
        expect(within(rows[2]).getByText('#402')).toBeInTheDocument();
        expect(within(rows[3]).getByText('#403')).toBeInTheDocument();
        expect(within(rows[4]).getByText('#404')).toBeInTheDocument();
        expect(apiClient.get).toHaveBeenCalledWith('/admin/bookings');
    });

    it('filters bookings by search, status, payment method, doctor, and date range together', async () => {
        const user = userEvent.setup();

        renderPage();
        await screen.findByTestId('booking-management-table');

        await user.type(screen.getByPlaceholderText('Search patient, doctor, contact email, booking id...'), 'casey.billing@example.com');
        await user.selectOptions(screen.getByLabelText('Status'), 'done');
        await user.selectOptions(screen.getByLabelText('Payment Method'), 'stripe');
        await user.selectOptions(screen.getByLabelText('Doctor'), '3');
        fireEvent.change(screen.getByLabelText('Date From'), { target: { value: '2026-04-14' } });
        fireEvent.change(screen.getByLabelText('Date To'), { target: { value: '2026-04-16' } });

        const table = screen.getByTestId('booking-management-table');
        const rows = within(table).getAllByRole('row');

        expect(rows).toHaveLength(2);
        expect(screen.getByText('#403')).toBeInTheDocument();
        expect(screen.queryByText('#401')).not.toBeInTheDocument();
        expect(screen.getByText('Showing 1 of 4 bookings.')).toBeInTheDocument();
    });
});
