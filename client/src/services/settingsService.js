import api from '../api/axios';

const settingsService = {
    // Profile (users)
    getProfile: async () => {
        return api.get('/users/me');
    },

    updateProfile: async (profileData) => {
        return api.patch('/users/me', profileData);
    },

    changePassword: async (currentPassword, newPassword) => {
        return api.put('/users/me/password', {
            current_password: currentPassword,
            new_password: newPassword,
        });
    },

    // Notification settings
    getNotificationSettings: async () => {
        return api.get('/settings/notifications');
    },

    updateNotificationSettings: async (settings) => {
        return api.patch('/settings/notifications', settings);
    },

    // AI preferences
    getAiPreferences: async () => {
        return api.get('/settings/ai');
    },

    updateAiPreferences: async (prefs) => {
        return api.patch('/settings/ai', prefs);
    }
};

export default settingsService;
