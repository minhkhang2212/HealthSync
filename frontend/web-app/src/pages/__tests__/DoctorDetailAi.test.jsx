import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
import DoctorDetail from '../DoctorDetail';

vi.mock('../../utils/apiClient', () => {
    const doctorPayload = {
        id: 7,
        name: 'Dr Cardio',
        email: 'doctor@example.com',
        roleId: 'R2',
        positionId: 'P0',
        phoneNumber: '0123456789',
        image: null,
        doctor_infor: {
            priceId: null,
            paymentId: null,
            note: 'Cardiology consultations',
            markdowns: [],
            nameClinic: 'London Heart Clinic',
            addressClinic: 'London Bridge',
        },
        doctor_clinic_specialties: [{
            clinicId: 10,
            specialtyId: 1,
            clinic: { id: 10, name: 'London Heart Clinic', address: 'London Bridge', image: null },
            specialty: { id: 1, name: 'Cardiology' },
        }],
    };

    const availabilityPayload = [{
        id: 1,
        doctorId: 7,
        date: '2026-03-30',
        timeType: 'T1',
        currentNumber: 0,
        isActive: true,
    }];

    return {
        __esModule: true,
        getApiAssetBase: vi.fn(() => ''),
        default: {
            get: vi.fn((url, options = {}) => {
                if (url === '/v1/doctors/7') {
                    return Promise.resolve({ data: doctorPayload });
                }
                if (url === '/v1/doctors/7/availability') {
                    return Promise.resolve({ data: availabilityPayload });
                }
                if (url === '/allcodes') {
                    return Promise.resolve({ data: [] });
                }
                return Promise.resolve({ data: options?.params?.type ? [] : {} });
            }),
            post: vi.fn(() => Promise.resolve({ data: {} })),
            interceptors: {
                request: { use: vi.fn() },
                response: { use: vi.fn() },
            },
        },
    };
});

const renderDoctorDetail = () => {
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
                user: {
                    id: 3,
                    name: 'Patient User',
                    email: 'patient@example.com',
                    gender: 'F',
                    phoneNumber: '0999888777',
                    roleId: 'R3',
                },
                token: 'token',
                isAuthenticated: true,
                loading: false,
                error: null,
            },
        },
    });

    return {
        store,
        ...render(
            <Provider store={store}>
                <MemoryRouter
                    initialEntries={[{
                        pathname: '/patient/doctor/7',
                        state: {
                            aiPrefill: {
                                doctorId: 7,
                                specialtyId: 1,
                                specialtyName: 'Cardiology',
                                reasonForVisit: 'Chest tightness with mild breathlessness.',
                                date: '2026-03-30',
                                timeType: 'T1',
                            },
                        },
                    }]}
                >
                    <Routes>
                        <Route path="/patient/doctor/:id" element={<DoctorDetail />} />
                    </Routes>
                </MemoryRouter>
            </Provider>
        ),
    };
};

describe('DoctorDetail AI prefill', () => {
    it('preselects the AI-recommended slot and prefills reason for visit in the booking modal', async () => {
        renderDoctorDetail();

        await waitFor(() => {
            expect(screen.getByDisplayValue('2026-03-30')).toBeInTheDocument();
        });

        const confirmButton = await screen.findByRole('button', { name: /Confirm Booking/i });
        await waitFor(() => expect(confirmButton).toBeEnabled());

        await userEvent.click(confirmButton);

        expect(await screen.findByDisplayValue('Chest tightness with mild breathlessness.')).toBeInTheDocument();
    });
});
