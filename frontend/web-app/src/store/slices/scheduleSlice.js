import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../../utils/apiClient';
import { TIME_CODES } from '../../utils/timeSlots';

export const fetchDoctorSchedules = createAsyncThunk(
    'schedule/fetchDoctorSchedules',
    async ({ date } = {}, { rejectWithValue }) => {
        try {
            const response = await apiClient.get('/doctor/schedules', {
                params: date ? { date } : {},
            });
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch schedules.');
        }
    }
);

export const saveDoctorSchedules = createAsyncThunk(
    'schedule/saveDoctorSchedules',
    async ({ date, enabledTimeTypes }, { rejectWithValue }) => {
        try {
            const enabled = new Set(enabledTimeTypes || []);
            const disabledTimeTypes = TIME_CODES.filter((timeType) => !enabled.has(timeType));

            const response = await apiClient.post('/doctor/schedules', { date, disabledTimeTypes });
            return response.data?.data ?? [];
        } catch (error) {
            const errors = error.response?.data?.errors;
            const message = errors
                ? Object.values(errors).flat().join(' ')
                : error.response?.data?.message || 'Failed to save schedules.';
            return rejectWithValue(message);
        }
    }
);

export const fetchDoctorBookings = createAsyncThunk(
    'schedule/fetchDoctorBookings',
    async (_, { rejectWithValue }) => {
        try {
            const response = await apiClient.get('/doctor/bookings');
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch bookings.');
        }
    }
);

export const cancelDoctorBooking = createAsyncThunk(
    'schedule/cancelDoctorBooking',
    async (id, { rejectWithValue }) => {
        try {
            const response = await apiClient.post(`/doctor/bookings/${id}/cancel`);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to cancel booking.');
        }
    }
);

export const markDoctorBookingDone = createAsyncThunk(
    'schedule/markDoctorBookingDone',
    async (id, { rejectWithValue }) => {
        try {
            const response = await apiClient.post(`/doctor/bookings/${id}/mark-done`);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to mark booking as done.');
        }
    }
);

export const markDoctorBookingNoShow = createAsyncThunk(
    'schedule/markDoctorBookingNoShow',
    async (id, { rejectWithValue }) => {
        try {
            const response = await apiClient.post(`/doctor/bookings/${id}/mark-no-show`);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to mark booking as no-show.');
        }
    }
);

const upsertBooking = (bookings, incoming) => {
    if (!incoming?.id) {
        return bookings;
    }

    const index = bookings.findIndex((item) => item.id === incoming.id);
    if (index === -1) {
        return [incoming, ...bookings];
    }

    const next = [...bookings];
    next[index] = incoming;
    return next;
};

const initialState = {
    schedules: [],
    bookings: [],
    loadingSchedules: false,
    loadingBookings: false,
    submitting: false,
    error: null,
};

const scheduleSlice = createSlice({
    name: 'schedule',
    initialState,
    reducers: {
        clearScheduleError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchDoctorSchedules.pending, (state) => {
                state.loadingSchedules = true;
                state.error = null;
            })
            .addCase(fetchDoctorSchedules.fulfilled, (state, action) => {
                state.loadingSchedules = false;
                state.schedules = action.payload;
            })
            .addCase(fetchDoctorSchedules.rejected, (state, action) => {
                state.loadingSchedules = false;
                state.error = action.payload;
            });

        builder
            .addCase(saveDoctorSchedules.pending, (state) => {
                state.submitting = true;
                state.error = null;
            })
            .addCase(saveDoctorSchedules.fulfilled, (state, action) => {
                state.submitting = false;
                state.schedules = action.payload;
            })
            .addCase(saveDoctorSchedules.rejected, (state, action) => {
                state.submitting = false;
                state.error = action.payload;
            });

        builder
            .addCase(fetchDoctorBookings.pending, (state) => {
                state.loadingBookings = true;
                state.error = null;
            })
            .addCase(fetchDoctorBookings.fulfilled, (state, action) => {
                state.loadingBookings = false;
                state.bookings = action.payload;
            })
            .addCase(fetchDoctorBookings.rejected, (state, action) => {
                state.loadingBookings = false;
                state.error = action.payload;
            });

        builder
            .addCase(cancelDoctorBooking.fulfilled, (state, action) => {
                state.bookings = upsertBooking(state.bookings, action.payload);
            })
            .addCase(cancelDoctorBooking.rejected, (state, action) => {
                state.error = action.payload;
            });

        builder
            .addCase(markDoctorBookingDone.fulfilled, (state, action) => {
                state.bookings = upsertBooking(state.bookings, action.payload);
            })
            .addCase(markDoctorBookingDone.rejected, (state, action) => {
                state.error = action.payload;
            });

        builder
            .addCase(markDoctorBookingNoShow.fulfilled, (state, action) => {
                state.bookings = upsertBooking(state.bookings, action.payload);
            })
            .addCase(markDoctorBookingNoShow.rejected, (state, action) => {
                state.error = action.payload;
            });
    },
});

export const { clearScheduleError } = scheduleSlice.actions;
export default scheduleSlice.reducer;
