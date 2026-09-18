import api from '../api/axios';

const rfpService = {
    getAll: async (params = {}) => {
        const response = await api.get('/rfps/', { params });
        return { data: response.data.items, total: response.data.total };
    },

    getById: async (rfpId) => {
        const response = await api.get(`/rfps/${rfpId}`);
        return response;
    },

    create: async (rfpData) => {
        return api.post('/rfps/', rfpData);
    },

    update: async (rfpId, rfpData) => {
        return api.patch(`/rfps/${rfpId}`, rfpData);
    },

    updateDocument: async (rfpId, document) => {
        return api.patch(`/rfps/${rfpId}/document`, { document });
    },

    publish: async (rfpId) => {
        return api.post(`/rfps/${rfpId}/publish`);
    },

    send: async (rfpId, vendorIds, message) => {
        return api.post(`/rfps/${rfpId}/send`, {
            vendor_ids: vendorIds,
            invitation_message: message || null,
        });
    },

    getAnalytics: async (rfpId) => {
        return api.get(`/rfps/${rfpId}/analytics`);
    },

    getHistory: async (rfpId) => {
        const response = await api.get(`/rfps/${rfpId}/history`);
        return { data: response.data.events };
    },

    delete: async (rfpId) => {
        return api.delete(`/rfps/${rfpId}`);
    }
};

export default rfpService;
