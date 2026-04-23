import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ClinicManagement from '../ClinicManagement';
import { renderWithProviders } from '../../utils/test-utils';

vi.mock('../../utils/apiClient', () => ({
    __esModule: true,
    getApiAssetBase: vi.fn(() => ''),
}));

const clinics = [
    {
        id: 1,
        name: 'North Medical Centre',
        address: '12 North Street',
        description: 'General practice and diagnostics',
        image: '',
    },
    {
        id: 2,
        name: 'South Skin Clinic',
        address: '44 High Road',
        description: 'Dermatology and cosmetic consultations',
        image: '',
    },
    {
        id: 3,
        name: 'Central Neuro Hub',
        address: '88 Queen Avenue',
        description: 'Neurology and specialist assessments',
        image: '',
    },
];

const renderPage = () =>
    renderWithProviders(<ClinicManagement />, {
        preloadedState: {
            auth: {
                user: { name: 'Admin Test User', roleId: 'R1' },
                isAuthenticated: true,
            },
            clinic: {
                clinics,
                loading: false,
                error: null,
            },
        },
    });

describe('ClinicManagement page', () => {
    it('renders clinic management with the new in-page search bar', () => {
        renderPage();

        expect(screen.getByRole('heading', { name: 'Clinic Management' })).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Search clinics by name, address, description...')).toBeInTheDocument();
        expect(screen.getByText('Showing all 3 clinics.')).toBeInTheDocument();
        expect(screen.getByText('North Medical Centre')).toBeInTheDocument();
        expect(screen.getByText('South Skin Clinic')).toBeInTheDocument();
        expect(screen.getByText('Central Neuro Hub')).toBeInTheDocument();
    });

    it('filters clinics by the new in-page search bar', async () => {
        const user = userEvent.setup();

        renderPage();

        await user.type(screen.getByPlaceholderText('Search clinics by name, address, description...'), 'skin');

        expect(screen.getByText('Showing 1 of 3 clinics.')).toBeInTheDocument();
        expect(screen.getByText('South Skin Clinic')).toBeInTheDocument();
        expect(screen.queryByText('North Medical Centre')).not.toBeInTheDocument();
        expect(screen.queryByText('Central Neuro Hub')).not.toBeInTheDocument();
    });
});
