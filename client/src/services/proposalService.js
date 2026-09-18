import api from '../api/axios';

const proposalService = {
    getAll: async (params = {}) => {
        const response = await api.get('/proposals/', { params });
        return { data: response.data.items, total: response.data.total };
    },

    getById: async (proposalId) => {
        return api.get(`/proposals/${proposalId}`);
    },

    compare: async (proposalIds) => {
        return api.get('/proposals/compare', { params: { ids: proposalIds.join(',') } });
    },

    updateStatus: async (proposalId, status) => {
        return api.patch(`/proposals/${proposalId}/status`, { status });
    },

    score: async (proposalId) => {
        return api.post(`/proposals/${proposalId}/score`);
    }
};

export default proposalService;
