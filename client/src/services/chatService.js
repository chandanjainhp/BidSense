import api from '../api/axios';

const chatService = {
    getConversations: async () => {
        const response = await api.get('/chat/conversations');
        return { data: response.data };
    },

    createConversation: async (title = null) => {
        return api.post('/chat/conversations', { title });
    },

    deleteConversation: async (conversationId) => {
        return api.delete(`/chat/conversations/${conversationId}`);
    },

    getMessages: async (conversationId) => {
        const response = await api.get(`/chat/conversations/${conversationId}/messages`);
        return { data: response.data };
    },

    sendMessage: async (conversationId, content) => {
        return api.post(`/chat/conversations/${conversationId}/messages`, { content });
    }
};

export default chatService;
