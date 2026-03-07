import { screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Login from '../Login';
import { renderWithProviders } from '../../utils/test-utils';

describe('Login Component', () => {
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
});
