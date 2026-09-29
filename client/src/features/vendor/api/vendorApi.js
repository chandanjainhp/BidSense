import api from '../../../api/axios';

// ---------------------------------------------------------------------------
// Vendor profile & registration
// ---------------------------------------------------------------------------

export const vendorApi = {
    register: (payload) => api.post('/vendors/register', payload),
    getMe: () => api.get('/vendors/me'),
    updateMe: (payload) => api.patch('/vendors/me', payload),
    getDashboard: () => api.get('/vendors/me/dashboard'),
    getPublicStores: (params = {}) => api.get('/vendors/store', { params }),
    getPublicStore: (vendorId) => api.get(`/vendors/store/${vendorId}`),
    // Public store content (verified vendors only, server-enforced)
    getPublicStoreProducts: (vendorId, params = {}) => api.get(`/vendors/store/${vendorId}/products`, { params }),
    getPublicStoreServices: (vendorId, params = {}) => api.get(`/vendors/store/${vendorId}/services`, { params }),
    getPublicStoreBulkSales: (vendorId) => api.get(`/vendors/store/${vendorId}/bulk-sales`),
};

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export const productApi = {
    list: (params = {}) => api.get('/vendors/me/products', { params }),
    get: (id) => api.get(`/vendors/me/products/${id}`),
    create: (payload) => api.post('/vendors/me/products', payload),
    update: (id, payload) => api.patch(`/vendors/me/products/${id}`, payload),
    remove: (id) => api.delete(`/vendors/me/products/${id}`),
};

// ---------------------------------------------------------------------------
// Services
// ---------------------------------------------------------------------------

export const serviceApi = {
    list: (params = {}) => api.get('/vendors/me/services', { params }),
    get: (id) => api.get(`/vendors/me/services/${id}`),
    create: (payload) => api.post('/vendors/me/services', payload),
    update: (id, payload) => api.patch(`/vendors/me/services/${id}`, payload),
    remove: (id) => api.delete(`/vendors/me/services/${id}`),
};

// ---------------------------------------------------------------------------
// Bulk sales
// ---------------------------------------------------------------------------

export const bulkSaleApi = {
    list: () => api.get('/vendors/me/bulk-sales'),
    create: (payload) => api.post('/vendors/me/bulk-sales', payload),
    update: (id, payload) => api.patch(`/vendors/me/bulk-sales/${id}`, payload),
    remove: (id) => api.delete(`/vendors/me/bulk-sales/${id}`),
};

// ---------------------------------------------------------------------------
// Inquiries (vendor side + buyer creation)
// ---------------------------------------------------------------------------

export const inquiryApi = {
    // Buyer submits an inquiry
    create: (payload) => api.post('/inquiries', payload),
    // Vendor manages received inquiries
    listMine: (params = {}) => api.get('/vendors/me/inquiries', { params }),
    getMine: (id) => api.get(`/vendors/me/inquiries/${id}`),
    updateStatus: (id, status) => api.patch(`/vendors/me/inquiries/${id}/status`, { status }),
};

// ---------------------------------------------------------------------------
// Quotations
// ---------------------------------------------------------------------------

export const quotationApi = {
    createForInquiry: (inquiryId, payload) =>
        api.post(`/vendors/me/inquiries/${inquiryId}/quotation`, payload),
    listMine: (params = {}) => api.get('/vendors/me/quotations', { params }),
    getMine: (id) => api.get(`/vendors/me/quotations/${id}`),
    // Buyer side
    listReceived: () => api.get('/quotations'),
    decide: (id, action) => api.post(`/quotations/${id}/decide`, { action }),
};

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export const orderApi = {
    listMine: (params = {}) => api.get('/vendors/me/orders', { params }),
    getMine: (id) => api.get(`/vendors/me/orders/${id}`),
    updateStatus: (id, status) => api.patch(`/vendors/me/orders/${id}/status`, { status }),
};

// ---------------------------------------------------------------------------
// Public marketplace browsing (no auth)
// ---------------------------------------------------------------------------

export const marketplaceApi = {
    listProducts: (params = {}) => api.get('/marketplace/products', { params }),
    listServices: (params = {}) => api.get('/marketplace/services', { params }),
    getProduct: (productId) => api.get(`/marketplace/products/${productId}`),
};

// ---------------------------------------------------------------------------
// Buyer tracking (auth required — resources derived from the JWT user)
// ---------------------------------------------------------------------------

export const buyerApi = {
    listInquiries: (params = {}) => api.get('/my/inquiries', { params }),
    getInquiry: (id) => api.get(`/my/inquiries/${id}`),
    listQuotations: () => api.get('/my/quotations'),
    listOrders: (params = {}) => api.get('/my/orders', { params }),
    getOrder: (id) => api.get(`/my/orders/${id}`),
};
