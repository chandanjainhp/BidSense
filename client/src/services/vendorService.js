import api from '../api/axios';

const vendorService = {
    getAll: async (params = {}) => {
        const response = await api.get('/vendors/', { params });
        return { data: response.data.items, total: response.data.total };
    },

    getById: async (vendorId) => {
        return api.get(`/vendors/${vendorId}`);
    },

    create: async (vendorData) => {
        return api.post('/vendors/', {
            name: vendorData.name,
            industry: vendorData.industry || null,
            website: vendorData.website || null,
            contact_name: vendorData.contactName || null,
            email: vendorData.email,
            phone: vendorData.phone || null,
            status: vendorData.status || 'pending',
            notes: vendorData.notes || null,
        });
    },

    update: async (vendorId, vendorData) => {
        return api.patch(`/vendors/${vendorId}`, vendorData);
    },

    delete: async (vendorId) => {
        return api.delete(`/vendors/${vendorId}`);
    },

    getMetrics: async () => {
        return api.get('/vendors/metrics');
    }
};

export default vendorService;
