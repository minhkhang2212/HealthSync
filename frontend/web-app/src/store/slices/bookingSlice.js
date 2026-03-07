import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../../utils/apiClient';

// Async Thunks
export const fetchBookings = createAsyncThunk(
    'booking/fetchBookings',
    async (_, { rejectWithValue }) => {
        try {
            const response = await apiClient.get('/patient/bookings');
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch bookings.');
        }
    }
);

export const createBooking = createAsyncThunk(
    'booking/createBooking',
    async (bookingData, { rejectWithValue }) => {
        try {
            const response = await apiClient.post('/patient/bookings', bookingData);
            return response.data;
        } catch (error) {
            const errors = error.response?.data?.errors;
            const message = errors
                ? Object.values(errors).flat().join(' ')
                : error.response?.data?.message || 'Failed to create booking.';
            return rejectWithValue(message);
        }
    }
);

export const cancelBooking = createAsyncThunk(
    'booking/cancelBooking',
    async (id, { rejectWithValue }) => {
        try {
            const response = await apiClient.post(`/patient/bookings/${id}/cancel`);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to cancel booking.');
        }
    }
);

// Slice
const initialState = {
    bookings: [],
    loading: false,
    error: null,
};

const bookingSlice = createSlice({
    name: 'booking',
    initialState,
    reducers: {
        clearError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        // Fetch
        builder
            .addCase(fetchBookings.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchBookings.fulfilled, (state, action) => {
                state.loading = false;
                state.bookings = action.payload;
            })
            .addCase(fetchBookings.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // Create
        builder
            .addCase(createBooking.fulfilled, (state, action) => {
                state.bookings.push(action.payload);
            })
            .addCase(createBooking.rejected, (state, action) => {
                state.error = action.payload;
            });

        // Cancel
        builder
            .addCase(cancelBooking.fulfilled, (state, action) => {
                if (action.payload?.id) {
                    const index = state.bookings.findIndex((b) => b.id === action.payload.id);
                    if (index !== -1) state.bookings[index] = action.payload;
                }
            })
            .addCase(cancelBooking.rejected, (state, action) => {
                state.error = action.payload;
            });
    },
});

export const { clearError } = bookingSlice.actions;
export default bookingSlice.reducer;
