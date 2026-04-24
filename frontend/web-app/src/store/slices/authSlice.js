import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../../utils/apiClient';

// Async Thunks
export const loginUser = createAsyncThunk(
    'auth/loginUser',
    async (credentials, { rejectWithValue }) => {
        try {
            const response = await apiClient.post('/auth/login', credentials);
            return response.data; // { access_token, token_type, user }
        } catch (error) {
            const errors = error.response?.data?.errors;
            const message = errors
                ? Object.values(errors).flat().join(' ')
                : error.response?.data?.message || 'Login failed. Please check your credentials.';
            return rejectWithValue(message);
        }
    }
);

export const registerUser = createAsyncThunk(
    'auth/registerUser',
    async (userData, { rejectWithValue }) => {
        try {
            const response = await apiClient.post('/auth/register', userData);
            return response.data; // { access_token, token_type, user }
        } catch (error) {
            const errors = error.response?.data?.errors;
            const message = errors
                ? Object.values(errors).flat().join(' ')
                : error.response?.data?.message || 'Registration failed.';
            return rejectWithValue(message);
        }
    }
);

export const fetchCurrentUser = createAsyncThunk(
    'auth/fetchCurrentUser',
    async (_, { rejectWithValue }) => {
        try {
            const response = await apiClient.get('/auth/me');
            return response.data; // user object
        } catch {
            return rejectWithValue('Session expired. Please login again.');
        }
    }
);

export const googleAuth = createAsyncThunk(
    'auth/googleAuth',
    async (credential, { rejectWithValue }) => {
        try {
            const response = await apiClient.post('/auth/google', { credential });
            return response.data; // { access_token, token_type, user }
        } catch (error) {
            const errors = error.response?.data?.errors;
            const message = errors
                ? Object.values(errors).flat().join(' ')
                : error.response?.data?.message || 'Google sign in failed.';
            return rejectWithValue(message);
        }
    }
);

export const logoutUser = createAsyncThunk(
    'auth/logoutUser',
    async (_, { rejectWithValue }) => {
        try {
            await apiClient.post('/auth/logout');
            return null;
        } catch {
            return rejectWithValue('Logout failed.');
        }
    }
);

// Slice
const initialState = {
    user: null,
    token: localStorage.getItem('auth_token') || null,
    isAuthenticated: !!localStorage.getItem('auth_token'),
    loading: false,
    error: null,
};

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        clearError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        const applyAuthSuccess = (state, action) => {
            state.loading = false;
            state.isAuthenticated = true;
            state.user = action.payload.user;
            state.token = action.payload.access_token;
            localStorage.setItem('auth_token', action.payload.access_token);
        };

        // Login
        builder
            .addCase(loginUser.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(loginUser.fulfilled, applyAuthSuccess)
            .addCase(loginUser.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // Register
        builder
            .addCase(registerUser.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(registerUser.fulfilled, applyAuthSuccess)
            .addCase(registerUser.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // Google Auth
        builder
            .addCase(googleAuth.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(googleAuth.fulfilled, applyAuthSuccess)
            .addCase(googleAuth.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // Fetch Current User
        builder
            .addCase(fetchCurrentUser.pending, (state) => {
                state.loading = true;
            })
            .addCase(fetchCurrentUser.fulfilled, (state, action) => {
                state.loading = false;
                state.user = action.payload;
                state.isAuthenticated = true;
            })
            .addCase(fetchCurrentUser.rejected, (state) => {
                state.loading = false;
                state.user = null;
                state.token = null;
                state.isAuthenticated = false;
                localStorage.removeItem('auth_token');
            });

        // Logout
        builder
            .addCase(logoutUser.fulfilled, (state) => {
                state.user = null;
                state.token = null;
                state.isAuthenticated = false;
                localStorage.removeItem('auth_token');
            })
            .addCase(logoutUser.rejected, (state) => {
                // Force logout even if API call fails
                state.user = null;
                state.token = null;
                state.isAuthenticated = false;
                localStorage.removeItem('auth_token');
            });
    },
});

export const { clearError } = authSlice.actions;
export default authSlice.reducer;
