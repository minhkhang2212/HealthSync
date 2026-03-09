import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../../utils/apiClient';

const buildSpecialtyPayload = (specialtyData = {}, methodOverride = null) => {
    const payload = new FormData();

    if (specialtyData.name !== undefined) {
        payload.append('name', specialtyData.name ?? '');
    }

    if (specialtyData.description !== undefined) {
        payload.append('description', specialtyData.description ?? '');
    }

    if (specialtyData.image !== undefined && specialtyData.image !== null && specialtyData.image !== '') {
        payload.append('image', specialtyData.image);
    }

    if (specialtyData.imageFile instanceof File) {
        payload.append('imageFile', specialtyData.imageFile);
    }

    if (specialtyData.removeImage) {
        payload.append('removeImage', '1');
    }

    if (methodOverride) {
        payload.append('_method', methodOverride);
    }

    return payload;
};

// Async Thunks
export const fetchSpecialties = createAsyncThunk(
    'specialty/fetchSpecialties',
    async (_, { rejectWithValue }) => {
        try {
            const response = await apiClient.get('/v1/specialties');
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch specialties.');
        }
    }
);

export const createSpecialty = createAsyncThunk(
    'specialty/createSpecialty',
    async (specialtyData, { rejectWithValue }) => {
        try {
            const payload = buildSpecialtyPayload(specialtyData);
            const response = await apiClient.post('/admin/specialties', payload, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            return response.data;
        } catch (error) {
            const errors = error.response?.data?.errors;
            const message = errors
                ? Object.values(errors).flat().join(' ')
                : error.response?.data?.message || 'Failed to create specialty.';
            return rejectWithValue(message);
        }
    }
);

export const updateSpecialty = createAsyncThunk(
    'specialty/updateSpecialty',
    async ({ id, data }, { rejectWithValue }) => {
        try {
            const payload = buildSpecialtyPayload(data, 'PATCH');
            const response = await apiClient.post(`/admin/specialties/${id}`, payload, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            return response.data;
        } catch (error) {
            const errors = error.response?.data?.errors;
            const message = errors
                ? Object.values(errors).flat().join(' ')
                : error.response?.data?.message || 'Failed to update specialty.';
            return rejectWithValue(message);
        }
    }
);

export const deleteSpecialty = createAsyncThunk(
    'specialty/deleteSpecialty',
    async (id, { rejectWithValue }) => {
        try {
            await apiClient.delete(`/admin/specialties/${id}`);
            return id;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to delete specialty.');
        }
    }
);

// Slice
const initialState = {
    specialties: [],
    selectedSpecialty: null,
    loading: false,
    error: null,
};

const specialtySlice = createSlice({
    name: 'specialty',
    initialState,
    reducers: {
        setSelectedSpecialty: (state, action) => {
            state.selectedSpecialty = action.payload;
        },
        clearError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        // Fetch
        builder
            .addCase(fetchSpecialties.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchSpecialties.fulfilled, (state, action) => {
                state.loading = false;
                state.specialties = action.payload;
            })
            .addCase(fetchSpecialties.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // Create
        builder
            .addCase(createSpecialty.fulfilled, (state, action) => {
                const index = state.specialties.findIndex((s) => s.id === action.payload.id);
                if (index !== -1) {
                    state.specialties[index] = action.payload;
                } else {
                    state.specialties.push(action.payload);
                }
            })
            .addCase(createSpecialty.rejected, (state, action) => {
                state.error = action.payload;
            });

        // Update
        builder
            .addCase(updateSpecialty.fulfilled, (state, action) => {
                const index = state.specialties.findIndex(s => s.id === action.payload.id);
                if (index !== -1) state.specialties[index] = action.payload;
            })
            .addCase(updateSpecialty.rejected, (state, action) => {
                state.error = action.payload;
            });

        // Delete
        builder
            .addCase(deleteSpecialty.fulfilled, (state, action) => {
                state.specialties = state.specialties.filter(s => s.id !== action.payload);
            })
            .addCase(deleteSpecialty.rejected, (state, action) => {
                state.error = action.payload;
            });
    },
});

export const { setSelectedSpecialty, clearError } = specialtySlice.actions;
export default specialtySlice.reducer;
