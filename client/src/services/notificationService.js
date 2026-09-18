import api from '../api/axios';

const notificationService = {
    getAll: async (params = {}) => {
        const response = await api.get('/notifications/', { params });
        return { data: response.data.items, total: response.data.total };
    },

    getUnreadCount: async () => {
        return api.get('/notifications/unread-count');
    },

    markRead: async (notificationId) => {
        return api.patch(`/notifications/${notificationId}/read`);
    },

    markAllRead: async () => {
        return api.post('/notifications/read-all');
    }
};

export default notificationService;
