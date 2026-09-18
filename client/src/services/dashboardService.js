import api from '../api/axios';

// Maps the FastAPI stat shape (color name + icon path) to what StatsGrid expects
const ICON_PATHS = {
    'Total RFPs': 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    'Active Vendors': 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
    'Proposals Received': 'M7 7h.01M7 11h.01M7 15h.01M11 7h.01M11 11h.01M11 15h.01M15 7h.01M15 11h.01M15 15h.01',
    'AI-Scored Proposals': 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0012 18.75c-1.03 0-1.9-.4-2.593-.91l-.548-.547z',
};

const mapStat = (stat) => ({
    ...stat,
    icon: ICON_PATHS[stat.label] || ICON_PATHS['Total RFPs'],
});

const dashboardService = {
    getStats: async () => {
        const response = await api.get('/dashboard/stats');
        return { data: response.data.stats.map(mapStat) };
    },

    getActivityFeed: async () => {
        const response = await api.get('/dashboard/activity');
        return { data: response.data.activities };
    }
};

export default dashboardService;
