import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import apiClient from '../../utils/apiClient';
import { extractApiErrorMessage } from '../../utils/apiErrors';

export const startAiTriageSession = createAsyncThunk(
    'ai/startAiTriageSession',
    async (_, { rejectWithValue }) => {
        try {
            const response = await apiClient.post('/patient/ai/triage/sessions');
            return response.data;
        } catch (error) {
            return rejectWithValue(extractApiErrorMessage(error, 'AI triage is unavailable right now.'));
        }
    }
);

export const sendAiTriageMessage = createAsyncThunk(
    'ai/sendAiTriageMessage',
    async (message, { dispatch, getState, rejectWithValue }) => {
        try {
            let { sessionId } = getState().ai;

            if (!sessionId) {
                const sessionResult = await dispatch(startAiTriageSession());
                if (!startAiTriageSession.fulfilled.match(sessionResult)) {
                    return rejectWithValue(sessionResult.payload || 'AI triage is unavailable right now.');
                }
                sessionId = sessionResult.payload.sessionId;
            }

            const response = await apiClient.post(`/patient/ai/triage/sessions/${sessionId}/messages`, {
                message,
            });

            return {
                sessionId,
                userMessage: message,
                ...response.data,
            };
        } catch (error) {
            return rejectWithValue(extractApiErrorMessage(error, 'AI triage is unavailable right now.'));
        }
    }
);

const initialState = {
    sessionId: null,
    disclaimer: '',
    messages: [],
    latestTriage: null,
    latestRecommendations: null,
    loading: false,
    initializing: false,
    error: null,
};

const aiSlice = createSlice({
    name: 'ai',
    initialState,
    reducers: {
        clearAiError: (state) => {
            state.error = null;
        },
        resetAiSession: () => initialState,
    },
    extraReducers: (builder) => {
        builder
            .addCase(startAiTriageSession.pending, (state) => {
                state.initializing = true;
                state.error = null;
            })
            .addCase(startAiTriageSession.fulfilled, (state, action) => {
                state.initializing = false;
                state.error = null;
                state.sessionId = action.payload.sessionId;
                state.disclaimer = action.payload.disclaimer || '';
                if (action.payload.assistantMessage) {
                    state.messages = [{
                        role: 'assistant',
                        content: action.payload.assistantMessage,
                    }];
                }
            })
            .addCase(startAiTriageSession.rejected, (state, action) => {
                state.initializing = false;
                state.error = action.payload;
            })
            .addCase(sendAiTriageMessage.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(sendAiTriageMessage.fulfilled, (state, action) => {
                state.loading = false;
                state.error = null;
                state.sessionId = action.payload.sessionId;
                state.disclaimer = action.payload.disclaimer || state.disclaimer;
                state.messages.push({
                    role: 'user',
                    content: action.payload.userMessage,
                });
                state.messages.push({
                    role: 'assistant',
                    content: action.payload.assistantMessage,
                });
                state.latestTriage = action.payload.triage;
                state.latestRecommendations = action.payload.recommendations;
            })
            .addCase(sendAiTriageMessage.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });
    },
});

export const { clearAiError, resetAiSession } = aiSlice.actions;
export default aiSlice.reducer;
