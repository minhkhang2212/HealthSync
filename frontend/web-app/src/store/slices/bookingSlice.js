import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../../utils/apiClient';
import { extractApiErrorMessage } from '../../utils/apiErrors';

// Async Thunks
export const fetchBookings = createAsyncThunk(
    'booking/fetchBookings',
    async (_, { rejectWithValue }) => {
        try {
            const response = await apiClient.get('/patient/bookings');
            return response.data;
        } catch (error) {
            return rejectWithValue(extractApiErrorMessage(error, 'Failed to fetch bookings.'));
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
            return rejectWithValue(extractApiErrorMessage(error, 'Failed to create booking.'));
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
            return rejectWithValue(extractApiErrorMessage(error, 'Failed to cancel booking.'));
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
                state.error = null;
                state.bookings = action.payload;
            })
            .addCase(fetchBookings.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // Create
        builder
            .addCase(createBooking.pending, (state) => {
                state.error = null;
            })
            .addCase(createBooking.fulfilled, (state, action) => {
                state.error = null;
                const booking = action.payload?.booking || action.payload;
                if (booking?.id) {
                    const existingIndex = state.bookings.findIndex((item) => item.id === booking.id);
                    if (existingIndex >= 0) {
                        state.bookings[existingIndex] = booking;
                    } else {
                        state.bookings.push(booking);
                    }
                }
            })
            .addCase(createBooking.rejected, (state, action) => {
                state.error = action.payload;
            });

        // Cancel
        builder
            .addCase(cancelBooking.pending, (state) => {
                state.error = null;
            })
            .addCase(cancelBooking.fulfilled, (state, action) => {
                state.error = null;
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
