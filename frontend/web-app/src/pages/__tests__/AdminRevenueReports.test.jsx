import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import AdminRevenueReports from '../AdminRevenueReports';
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

describe('AdminRevenueReports Component', () => {
    const originalCreateElement = document.createElement.bind(document);
    let downloadClickSpy;
    let downloadRemoveSpy;
    let downloadedAnchor;

    beforeEach(() => {
        downloadClickSpy = vi.fn();
        downloadRemoveSpy = vi.fn();
        downloadedAnchor = null;

        vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
            const element = originalCreateElement(tagName);
            if (String(tagName).toLowerCase() === 'a') {
                element.click = downloadClickSpy;
                element.remove = downloadRemoveSpy;
                downloadedAnchor = element;
            }
            return element;
        });

        global.URL.createObjectURL = vi.fn(() => 'blob:revenue-report');
        global.URL.revokeObjectURL = vi.fn();

        apiClient.get.mockImplementation((url, options) => {
            if (url === '/admin/revenue/monthly') {
                return Promise.resolve({
                    data: {
                        items: [
                            {
                                month: '2026-04',
                                label: 'April 2026',
                                periodStart: '2026-04-01',
                                periodEnd: '2026-04-30',
                                recognizedRevenueAmount: 8000,
                                recognizedRevenueCurrency: 'gbp',
                                paidBookingsCount: 2,
                            },
                            {
                                month: '2026-03',
                                label: 'March 2026',
                                periodStart: '2026-03-01',
                                periodEnd: '2026-03-31',
                                recognizedRevenueAmount: 6500,
                                recognizedRevenueCurrency: 'gbp',
                                paidBookingsCount: 1,
                            },
                        ],
                        currentMonth: '2026-04',
                        recognizedRevenueCurrency: 'gbp',
                    },
                });
            }

            if (url === '/admin/revenue/monthly/2026-04/pdf' && options?.responseType === 'blob') {
                return Promise.resolve({
                    data: new Blob(['%PDF-1.4'], { type: 'application/pdf' }),
                    headers: {
                        'content-disposition': 'attachment; filename="healthsync-revenue-2026-04.pdf"',
                    },
                });
            }

            return Promise.resolve({ data: {} });
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('renders monthly revenue history and downloads the selected PDF report', async () => {
        const user = userEvent.setup();

        renderWithProviders(<AdminRevenueReports />, {
            preloadedState: {
                auth: {
                    user: { name: 'Admin Test User', roleId: 'R1' },
                    isAuthenticated: true,
                },
            },
        });

        expect(await screen.findByRole('heading', { name: 'Revenue Reports' })).toBeInTheDocument();
        expect(await screen.findByRole('button', { name: 'Download PDF for April 2026' })).toBeInTheDocument();
        expect(screen.getAllByText('April 2026')).toHaveLength(2);
        expect(screen.getAllByText('GBP 80.00')[0]).toBeInTheDocument();
        expect(screen.getByText('March 2026')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Download PDF for April 2026' }));

        await waitFor(() => {
            expect(apiClient.get).toHaveBeenCalledWith('/admin/revenue/monthly/2026-04/pdf', {
                responseType: 'blob',
            });
        });

        expect(global.URL.createObjectURL).toHaveBeenCalled();
        expect(downloadedAnchor?.download).toBe('healthsync-revenue-2026-04.pdf');
        expect(downloadClickSpy).toHaveBeenCalledTimes(1);
        expect(downloadRemoveSpy).toHaveBeenCalledTimes(1);
        expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:revenue-report');
    });
});
