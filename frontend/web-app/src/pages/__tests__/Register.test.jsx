import { screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Register from '../Register';
import { renderWithProviders } from '../../utils/test-utils';

describe('Register Component', () => {
    it('renders registration form properly', () => {
        renderWithProviders(<Register />);

        // The heading says "Create Account"
        expect(screen.getByRole('heading', { name: /Create Account/i })).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/John/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/Doe/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/name@example.com/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/••••••••/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Create Account/i })).toBeInTheDocument();
    });

    it('displays error message from Redux state', () => {
        const preloadedState = {
            auth: {
                user: null,
                token: null,
                isAuthenticated: false,
                loading: false,
                error: 'Email already exists',
            }
        };

        renderWithProviders(<Register />, { preloadedState });

        expect(screen.getByText('Email already exists')).toBeInTheDocument();
    });
});
