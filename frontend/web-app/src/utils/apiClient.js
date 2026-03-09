import axios from 'axios';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

export const getApiAssetBase = () => {
    try {
        const url = new URL(apiBaseUrl, window.location.origin);
        let pathname = url.pathname.replace(/\/+$/, '');
        if (pathname.endsWith('/api')) {
            pathname = pathname.slice(0, -4);
        }
        return `${url.origin}${pathname}`;
    } catch {
        return '';
    }
};

// The Laravel backend base URL
const apiClient = axios.create({
    baseURL: apiBaseUrl,
    headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
    }
});

// Request interceptor to attach the Sanctum auth token
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('auth_token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor to handle 401 Unauthorized globally
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            localStorage.removeItem('auth_token');
            // Optionally redirect to login or dispatch a logout action
        }
        return Promise.reject(error);
    }
);

export default apiClient;
