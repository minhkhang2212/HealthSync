import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../../utils/apiClient';

// Async Thunks
export const fetchClinics = createAsyncThunk(
    'clinic/fetchClinics',
    async (_, { rejectWithValue }) => {
        try {
            const response = await apiClient.get('/v1/clinics');
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch clinics.');
        }
    }
);

export const createClinic = createAsyncThunk(
    'clinic/createClinic',
    async (clinicData, { rejectWithValue }) => {
        try {
            const response = await apiClient.post('/admin/clinics', clinicData);
            return response.data;
        } catch (error) {
            const errors = error.response?.data?.errors;
            const message = errors
                ? Object.values(errors).flat().join(' ')
                : error.response?.data?.message || 'Failed to create clinic.';
            return rejectWithValue(message);
        }
    }
);

export const updateClinic = createAsyncThunk(
    'clinic/updateClinic',
    async ({ id, data }, { rejectWithValue }) => {
        try {
            const response = await apiClient.patch(`/admin/clinics/${id}`, data);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to update clinic.');
        }
    }
);

export const deleteClinic = createAsyncThunk(
    'clinic/deleteClinic',
    async (id, { rejectWithValue }) => {
        try {
            await apiClient.delete(`/admin/clinics/${id}`);
            return id;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to delete clinic.');
        }
    }
);

// Slice
const initialState = {
    clinics: [],
    selectedClinic: null,
    loading: false,
    error: null,
};

const clinicSlice = createSlice({
    name: 'clinic',
    initialState,
    reducers: {
        setSelectedClinic: (state, action) => {
            state.selectedClinic = action.payload;
        },
        clearError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        // Fetch
        builder
            .addCase(fetchClinics.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchClinics.fulfilled, (state, action) => {
                state.loading = false;
                state.clinics = action.payload;
            })
            .addCase(fetchClinics.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // Create
        builder
            .addCase(createClinic.fulfilled, (state, action) => {
                state.clinics.push(action.payload);
            })
            .addCase(createClinic.rejected, (state, action) => {
                state.error = action.payload;
            });

        // Update
        builder
            .addCase(updateClinic.fulfilled, (state, action) => {
                const index = state.clinics.findIndex(c => c.id === action.payload.id);
                if (index !== -1) state.clinics[index] = action.payload;
            })
            .addCase(updateClinic.rejected, (state, action) => {
                state.error = action.payload;
            });

        // Delete
        builder
            .addCase(deleteClinic.fulfilled, (state, action) => {
                state.clinics = state.clinics.filter(c => c.id !== action.payload);
            })
            .addCase(deleteClinic.rejected, (state, action) => {
                state.error = action.payload;
            });
    },
});

export const { setSelectedClinic, clearError } = clinicSlice.actions;
export default clinicSlice.reducer;
