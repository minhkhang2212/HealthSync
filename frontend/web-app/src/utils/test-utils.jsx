import React from 'react';
import { render } from '@testing-library/react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';

// Import your reducers
import authReducer from '../store/slices/authSlice';
import userReducer from '../store/slices/userSlice';
import bookingReducer from '../store/slices/bookingSlice';
import clinicReducer from '../store/slices/clinicSlice';
import specialtyReducer from '../store/slices/specialtySlice';
import doctorReducer from '../store/slices/doctorSlice';
import scheduleReducer from '../store/slices/scheduleSlice';
import aiReducer from '../store/slices/aiSlice';

export function renderWithProviders(
    ui,
    {
        preloadedState = {},
        // Automatically create a store instance if no store was passed in
        store = configureStore({
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
            preloadedState,
        }),
        ...renderOptions
    } = {}
) {
    function Wrapper({ children }) {
        return (
            <Provider store={store}>
                <BrowserRouter>{children}</BrowserRouter>
            </Provider>
        );
    }

    // Return an object with the store and all of RTL's query functions
    return { store, ...render(ui, { wrapper: Wrapper, ...renderOptions }) };
}
