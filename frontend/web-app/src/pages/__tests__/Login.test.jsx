import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import Login from '../Login';
import { renderWithProviders } from '../../utils/test-utils';
import apiClient from '../../utils/apiClient';

vi.mock('../../utils/apiClient', () => ({
    default: {
        post: vi.fn(),
        get: vi.fn(),
    },
}));

describe('Login Component', () => {
    let googleCallback;

    beforeEach(() => {
        vi.stubEnv('VITE_GOOGLE_CLIENT_ID', '');
        googleCallback = undefined;
        apiClient.post.mockReset();
        window.google = {
            accounts: {
                id: {
                    initialize: vi.fn(({ callback }) => {
                        googleCallback = callback;
                    }),
                    prompt: vi.fn(() => {
                        googleCallback?.({ credential: 'google-credential' });
                    }),
                },
            },
        };
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        delete window.google;
    });

    it('renders login form properly', () => {
        renderWithProviders(<Login />);

        expect(screen.getByText(/Welcome Back/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/name@company.com/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/••••••••/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument();
    });

    it('renders login action button', () => {
        renderWithProviders(<Login />);
        expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument();
    });

    it('displays error message from Redux state', () => {
        const preloadedState = {
            auth: {
                user: null,
                token: null,
                isAuthenticated: false,
                loading: false,
                error: 'Invalid Credentials',
            }
        };

        renderWithProviders(<Login />, { preloadedState });

        expect(screen.getByText('Invalid Credentials')).toBeInTheDocument();
    });

    it('displays patient-only Google error from Redux state', () => {
        const preloadedState = {
            auth: {
                user: null,
                token: null,
                isAuthenticated: false,
                loading: false,
                error: 'Google sign in is only available for patient accounts.',
            }
        };

        renderWithProviders(<Login />, { preloadedState });

        expect(screen.getByText('Google sign in is only available for patient accounts.')).toBeInTheDocument();
    });

    it('does not render Google button without a Google client id', () => {
        renderWithProviders(<Login />);

        expect(screen.queryByRole('button', { name: /Continue with Google \(Patients only\)/i })).not.toBeInTheDocument();
    });

    it('renders Google button with a client id and submits the credential', async () => {
        vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'google-client-id');
        apiClient.post.mockResolvedValueOnce({
            data: {
                access_token: 'token',
                token_type: 'Bearer',
                user: { id: 1, roleId: 'R3' },
            },
        });

        renderWithProviders(<Login />);
        await userEvent.click(screen.getByRole('button', { name: /Continue with Google \(Patients only\)/i }));

        expect(window.google.accounts.id.initialize).toHaveBeenCalledWith(expect.objectContaining({
            client_id: 'google-client-id',
        }));
        await waitFor(() => {
            expect(apiClient.post).toHaveBeenCalledWith('/auth/google', { credential: 'google-credential' });
        });
    });
});
