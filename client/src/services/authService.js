import api from '../api/axios';

const authService = {
    login: async (email, password) => {
        const response = await api.post('/auth/login', { email, password });
        // Backend serializes with camelCase aliases (refreshToken)
        const { token, refreshToken, refresh_token } = response.data;
        if (token) {
            localStorage.setItem('token', token);
        }
        const refresh = refreshToken || refresh_token;
        if (refresh) {
            localStorage.setItem('refresh_token', refresh);
        }
        return response;
    },

    register: async ({ fullName, email, password }) => {
        return api.post('/auth/register', {
            full_name: fullName,
            email,
            password,
        });
    },

    verifyOtp: async (email, code) => {
        const response = await api.post('/auth/verify-otp', { email, code });
        // Backend serializes with camelCase aliases (refreshToken)
        const { token, refreshToken, refresh_token } = response.data;
        if (token) {
            localStorage.setItem('token', token);
        }
        const refresh = refreshToken || refresh_token;
        if (refresh) {
            localStorage.setItem('refresh_token', refresh);
        }
        return response;
    },

    resendOtp: async (email) => {
        return api.post('/auth/resend-otp', { email });
    },

    forgotPassword: async (email) => {
        return api.post('/auth/forgot-password', { email });
    },

    resetPassword: async ({ email, code, newPassword }) => {
        return api.post('/auth/reset-password', {
            email,
            code,
            new_password: newPassword,
        });
    },

    logout: () => {
        const token = localStorage.getItem('token');
        if (token) {
            api.post('/auth/logout').catch(() => { /* best effort */ });
        }
        localStorage.removeItem('token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
    }
};

export default authService;
