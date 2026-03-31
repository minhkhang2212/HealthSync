import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import authReducer from '../../store/slices/authSlice';
import userReducer from '../../store/slices/userSlice';
import bookingReducer from '../../store/slices/bookingSlice';
import clinicReducer from '../../store/slices/clinicSlice';
import specialtyReducer from '../../store/slices/specialtySlice';
import doctorReducer from '../../store/slices/doctorSlice';
import scheduleReducer from '../../store/slices/scheduleSlice';
import aiReducer from '../../store/slices/aiSlice';
import PatientPaymentStatus from '../PatientPaymentStatus';

vi.mock('../../utils/apiClient', () => ({
    __esModule: true,
    default: {
        get: vi.fn(() => Promise.resolve({
            data: {
                id: 42,
                doctorId: 7,
                date: '2026-04-01',
                timeType: 'T1',
                statusId: 'S1',
                paymentMethod: 'stripe',
                paymentStatus: 'paid',
                bookingDetails: {
                    reasonForVisit: 'Chest tightness and mild breathlessness.',
                },
            },
        })),
        post: vi.fn(() => Promise.resolve({ data: {} })),
        interceptors: {
            request: { use: vi.fn() },
            response: { use: vi.fn() },
        },
    },
}));

const renderPaymentStatus = () => {
    const store = configureStore({
        reducer: {
            auth: authReducer,
            user: userReducer,
            booking: bookingReducer,
            clinic: clinicReducer,
            specialty: specialtyReducer,
            doctor: doctorReducer,
            schedule: scheduleReducer,
            ai: aiReducer,
        },
        preloadedState: {
            auth: {
                user: { id: 3, name: 'Patient User', roleId: 'R3' },
                token: 'token',
                isAuthenticated: true,
                loading: false,
                error: null,
            },
        },
    });

    return render(
        <Provider store={store}>
            <MemoryRouter initialEntries={['/patient/bookings/42/payment?checkout=success']}>
                <Routes>
                    <Route path="/patient/bookings/:bookingId/payment" element={<PatientPaymentStatus />} />
                </Routes>
            </MemoryRouter>
        </Provider>
    );
};

describe('PatientPaymentStatus', () => {
    it('shows a clear paid status after successful Stripe return', async () => {
        renderPaymentStatus();

        await waitFor(() => {
            expect(screen.getByText(/Payment Received/i)).toBeInTheDocument();
        });

        expect(screen.getByText(/#42/i)).toBeInTheDocument();
        expect(screen.getByText(/Paid online/i)).toBeInTheDocument();
        expect(screen.getByText(/What Happens Next/i)).toBeInTheDocument();
        expect(screen.getAllByRole('button', { name: /Go to Dashboard/i }).length).toBeGreaterThan(0);
    });
});
