import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../../utils/apiClient';
import { TIME_CODES } from '../../utils/timeSlots';
import { extractApiErrorMessage } from '../../utils/apiErrors';

export const fetchDoctorSchedules = createAsyncThunk(
    'schedule/fetchDoctorSchedules',
    async ({ date } = {}, { rejectWithValue }) => {
        try {
            const response = await apiClient.get('/doctor/schedules', {
                params: date ? { date } : {},
            });
            return response.data;
        } catch (error) {
            return rejectWithValue(extractApiErrorMessage(error, 'Failed to fetch schedules.'));
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
            return rejectWithValue(extractApiErrorMessage(error, 'Failed to save schedules.'));
        }
    }
);

export const fetchDoctorBookings = createAsyncThunk(
    'schedule/fetchDoctorBookings',
    async ({ date } = {}, { rejectWithValue }) => {
        try {
            const response = await apiClient.get('/doctor/bookings', {
                params: date ? { date } : {},
            });
            return response.data;
        } catch (error) {
            return rejectWithValue(extractApiErrorMessage(error, 'Failed to fetch bookings.'));
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
            return rejectWithValue(extractApiErrorMessage(error, 'Failed to cancel booking.'));
        }
    }
);

export const confirmDoctorBooking = createAsyncThunk(
    'schedule/confirmDoctorBooking',
    async ({ id, attachmentFile }, { rejectWithValue }) => {
        try {
            const payload = new FormData();
            if (attachmentFile instanceof File) {
                payload.append('confirmationFile', attachmentFile);
            }

            const response = await apiClient.post(`/doctor/bookings/${id}/confirm`, payload, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            return response.data;
        } catch (error) {
            return rejectWithValue(extractApiErrorMessage(error, 'Failed to confirm booking.'));
        }
    }
);

export const sendDoctorPrescription = createAsyncThunk(
    'schedule/sendDoctorPrescription',
    async ({ id, attachmentFile }, { rejectWithValue }) => {
        try {
            const payload = new FormData();
            if (attachmentFile instanceof File) {
                payload.append('prescriptionFile', attachmentFile);
            }

            const response = await apiClient.post(`/doctor/bookings/${id}/send-prescription`, payload, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            return response.data;
        } catch (error) {
            return rejectWithValue(extractApiErrorMessage(error, 'Failed to send prescription.'));
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
            return rejectWithValue(extractApiErrorMessage(error, 'Failed to mark booking as no-show.'));
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
                state.error = null;
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
                state.error = null;
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
                state.error = null;
                state.bookings = action.payload;
            })
            .addCase(fetchDoctorBookings.rejected, (state, action) => {
                state.loadingBookings = false;
                state.error = action.payload;
            });

        builder
            .addCase(cancelDoctorBooking.pending, (state) => {
                state.error = null;
            })
            .addCase(cancelDoctorBooking.fulfilled, (state, action) => {
                state.error = null;
                state.bookings = upsertBooking(state.bookings, action.payload);
            })
            .addCase(cancelDoctorBooking.rejected, (state, action) => {
                state.error = action.payload;
            });

        builder
            .addCase(confirmDoctorBooking.pending, (state) => {
                state.error = null;
            })
            .addCase(confirmDoctorBooking.fulfilled, (state, action) => {
                state.error = null;
                state.bookings = upsertBooking(state.bookings, action.payload);
            })
            .addCase(confirmDoctorBooking.rejected, (state, action) => {
                state.error = action.payload;
            });

        builder
            .addCase(sendDoctorPrescription.pending, (state) => {
                state.error = null;
            })
            .addCase(sendDoctorPrescription.fulfilled, (state, action) => {
                state.error = null;
                state.bookings = upsertBooking(state.bookings, action.payload);
            })
            .addCase(sendDoctorPrescription.rejected, (state, action) => {
                state.error = action.payload;
            });

        builder
            .addCase(markDoctorBookingNoShow.pending, (state) => {
                state.error = null;
            })
            .addCase(markDoctorBookingNoShow.fulfilled, (state, action) => {
                state.error = null;
                state.bookings = upsertBooking(state.bookings, action.payload);
            })
            .addCase(markDoctorBookingNoShow.rejected, (state, action) => {
                state.error = action.payload;
            });
    },
});

export const { clearScheduleError } = scheduleSlice.actions;
export default scheduleSlice.reducer;
