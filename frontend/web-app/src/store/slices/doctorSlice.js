import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../../utils/apiClient';

export const fetchDoctors = createAsyncThunk(
    'doctor/fetchDoctors',
    async (params = {}, { rejectWithValue }) => {
        try {
            const requestParams = { ...params };
            const useAdminEndpoint = requestParams.admin === true;
            delete requestParams.admin;

            const response = await apiClient.get(useAdminEndpoint ? '/admin/doctors' : '/v1/doctors', {
                params: requestParams,
            });
            return response.data?.data ?? response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch doctors.');
        }
    }
);

export const fetchDoctorById = createAsyncThunk(
    'doctor/fetchDoctorById',
    async (id, { rejectWithValue }) => {
        try {
            const response = await apiClient.get(`/v1/doctors/${id}`);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch doctor profile.');
        }
    }
);

export const fetchDoctorAvailability = createAsyncThunk(
    'doctor/fetchDoctorAvailability',
    async ({ id, date }, { rejectWithValue }) => {
        try {
            const response = await apiClient.get(`/v1/doctors/${id}/availability`, {
                params: date ? { date } : {},
            });
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch doctor availability.');
        }
    }
);

const initialState = {
    doctors: [],
    selectedDoctor: null,
    availability: [],
    loading: false,
    error: null,
};

const doctorSlice = createSlice({
    name: 'doctor',
    initialState,
    reducers: {
        clearDoctorError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchDoctors.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchDoctors.fulfilled, (state, action) => {
                state.loading = false;
                state.doctors = action.payload;
            })
            .addCase(fetchDoctors.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        builder
            .addCase(fetchDoctorById.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchDoctorById.fulfilled, (state, action) => {
                state.loading = false;
                state.selectedDoctor = action.payload;
            })
            .addCase(fetchDoctorById.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        builder
            .addCase(fetchDoctorAvailability.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchDoctorAvailability.fulfilled, (state, action) => {
                state.loading = false;
                state.availability = action.payload;
            })
            .addCase(fetchDoctorAvailability.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });
    },
});

export const { clearDoctorError } = doctorSlice.actions;
export default doctorSlice.reducer;
