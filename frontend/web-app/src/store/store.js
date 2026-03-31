import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import userReducer from './slices/userSlice';
import bookingReducer from './slices/bookingSlice';
import clinicReducer from './slices/clinicSlice';
import specialtyReducer from './slices/specialtySlice';
import doctorReducer from './slices/doctorSlice';
import scheduleReducer from './slices/scheduleSlice';
import aiReducer from './slices/aiSlice';

export const store = configureStore({
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
});
