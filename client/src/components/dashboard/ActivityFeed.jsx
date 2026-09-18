import React from 'react';
import { useNavigate } from 'react-router-dom';

import { useState, useEffect } from 'react';
import dashboardService from '../../services/dashboardService';

const ActivityFeed = () => {
    const navigate = useNavigate();
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchActivity = async () => {
            try {
                const response = await dashboardService.getActivityFeed();
                // Adapter: Map service data to UI format if needed
                const mappedData = response.data.map(item => ({
                    ...item,
                    type: item.user === 'AI Assistant' ? 'AI' : 'Proposal', // Simple derivation
                    rfp: item.target
                }));
                setActivities(mappedData);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchActivity();
    }, []);

    const handleActivityClick = (type) => {
        if (type === 'Proposal') navigate('/proposals');
        else if (type === 'AI') navigate('/rfps/editor');
        else if (type === 'Vendor') navigate('/vendors');
        else navigate('/dashboard');
    };

    return (
        <div className="bg-white dark:bg-gray-900/50 backdrop-blur-xl rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Recent Activity</h2>
            <div className="space-y-6">
                {loading ? (
                    [1, 2, 3].map(i => <div key={i} className="h-12 bg-gray-50 dark:bg-white/5 rounded-lg animate-pulse" />)
                ) : (
                    activities.map((item) => (
                        <div
                            key={item.id}
                            className="flex space-x-4 cursor-pointer group p-3 -mx-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors items-start"
                            onClick={() => handleActivityClick(item.type)}
                        >
                            <div className={`p-2 rounded-lg flex-shrink-0 ${item.type === 'AI' ? 'bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400' : 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'}`}>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon && item.icon.startsWith('M') ? item.icon : 'M13 10V3L4 14h7v7l9-11h-7z'} />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm text-gray-800 dark:text-gray-300 leading-snug">
                                    <span className="font-bold text-gray-900 dark:text-white">{item.user}</span> {item.action} <span className="font-bold text-indigo-600 dark:text-indigo-400 group-hover:underline">{item.rfp}</span>
                                </p>
                                <span className="text-xs text-gray-400 dark:text-gray-500 font-medium mt-1 block">{item.time}</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
            <button
                onClick={() => navigate('/rfps/history')}
                className="w-full mt-6 py-3 border-2 border-gray-100 dark:border-gray-800 text-gray-400 dark:text-gray-500 text-sm font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-600 dark:hover:text-gray-300 transition-all uppercase tracking-wide"
            >
                View Feed
            </button>
        </div>
    );
};

export default ActivityFeed;
