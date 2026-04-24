import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import Register from '../Register';
import { renderWithProviders } from '../../utils/test-utils';
import apiClient from '../../utils/apiClient';

vi.mock('../../utils/apiClient', () => ({
    default: {
        post: vi.fn(),
        get: vi.fn(),
    },
}));

describe('Register Component', () => {
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

    it('renders the updated registration form properly', () => {
        renderWithProviders(<Register />);

        expect(screen.getByRole('heading', { name: /Create Account/i })).toBeInTheDocument();
        expect(screen.getByText(/Join HealthSync to manage your wellness journey\./i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/John/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/Doe/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/name@example.com/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/Create a password/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/Confirm your password/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Create Account/i })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Continue with Google \(Patients only\)/i })).not.toBeInTheDocument();
        expect(screen.queryByText(/HIPAA Compliant & Encrypted Data/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/verified_user/i)).not.toBeInTheDocument();
    });

    it('displays error message from Redux state', () => {
        const preloadedState = {
            auth: {
                user: null,
                token: null,
                isAuthenticated: false,
                loading: false,
                error: 'Email already exists',
            },
        };

        renderWithProviders(<Register />, { preloadedState });

        expect(screen.getByText('Email already exists')).toBeInTheDocument();
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

        renderWithProviders(<Register />);
        await userEvent.click(screen.getByRole('button', { name: /Continue with Google \(Patients only\)/i }));

        expect(window.google.accounts.id.initialize).toHaveBeenCalledWith(expect.objectContaining({
            client_id: 'google-client-id',
        }));
        await waitFor(() => {
            expect(apiClient.post).toHaveBeenCalledWith('/auth/google', { credential: 'google-credential' });
        });
    });

    it('submits phone number and gender during local registration', async () => {
        apiClient.post.mockResolvedValueOnce({
            data: {
                access_token: 'token',
                token_type: 'Bearer',
                user: { id: 1, roleId: 'R3' },
            },
        });

        renderWithProviders(<Register />);

        await userEvent.type(screen.getByPlaceholderText(/John/i), 'Jane');
        await userEvent.type(screen.getByPlaceholderText(/Doe/i), 'Patient');
        await userEvent.type(screen.getByPlaceholderText(/name@example.com/i), 'jane@test.com');
        await userEvent.type(screen.getByPlaceholderText(/\+44 \(555\) 000-0000/i), '+441234567890');
        await userEvent.type(screen.getByPlaceholderText(/Create a password/i), 'password123');
        await userEvent.type(screen.getByPlaceholderText(/Confirm your password/i), 'password123');
        await userEvent.click(screen.getByLabelText(/Female/i));
        await userEvent.click(screen.getByRole('button', { name: /Create Account/i }));

        await waitFor(() => {
            expect(apiClient.post).toHaveBeenCalledWith('/auth/register', {
                name: 'Jane Patient',
                email: 'jane@test.com',
                password: 'password123',
                password_confirmation: 'password123',
                phoneNumber: '+441234567890',
                gender: 'F',
            });
        });
    });

    it('displays patient-only Google error from Redux state', async () => {
        const preloadedState = {
            auth: {
                user: null,
                token: null,
                isAuthenticated: false,
                loading: false,
                error: 'Google sign in is only available for patient accounts.',
            },
        };

        renderWithProviders(<Register />, { preloadedState });

        await waitFor(() => {
            expect(screen.getByText('Google sign in is only available for patient accounts.')).toBeInTheDocument();
        });
    });
});
