import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor for attaching auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// ---- 401 handling: try a refresh-token round-trip once, else redirect to login ----
let isRefreshing = false;
let refreshSubscribers = [];

const onTokenRefreshed = (newToken) => {
    refreshSubscribers.forEach((cb) => cb(newToken));
    refreshSubscribers = [];
};

const addRefreshSubscriber = (cb) => {
    refreshSubscribers.push(cb);
};

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        const status = error.response?.status;
        const isAuthEndpoint = originalRequest?.url?.includes('/auth/login')
            || originalRequest?.url?.includes('/auth/refresh')
            || originalRequest?.url?.includes('/auth/register')
            || originalRequest?.url?.includes('/auth/verify-otp');

        if (status === 401 && originalRequest && !originalRequest._retry && !isAuthEndpoint) {
            if (isRefreshing) {
                // A refresh is already in flight; wait for its result
                return new Promise((resolve, reject) => {
                    addRefreshSubscriber((newToken) => {
                        if (newToken) {
                            originalRequest.headers.Authorization = `Bearer ${newToken}`;
                            resolve(api(originalRequest));
                        } else {
                            reject(error);
                        }
                    });
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;
            const refreshToken = localStorage.getItem('refresh_token');

            try {
                if (!refreshToken) throw new Error('No refresh token');
                const { data } = await axios.post(
                    `${api.defaults.baseURL}/auth/refresh`,
                    { refresh_token: refreshToken }
                );
                // Backend serializes with camelCase aliases (refreshToken)
                const newToken = data.token || data.access_token;
                if (!newToken) throw new Error('No token in refresh response');
                localStorage.setItem('token', newToken);
                const newRefresh = data.refreshToken || data.refresh_token;
                if (newRefresh) localStorage.setItem('refresh_token', newRefresh);
                onTokenRefreshed(newToken);
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                return api(originalRequest);
            } catch (refreshErr) {
                onTokenRefreshed(null);
                localStorage.removeItem('token');
                localStorage.removeItem('refresh_token');
                if (window.location.pathname !== '/login') {
                    window.location.href = '/login';
                }
                return Promise.reject(refreshErr);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

export default api;
