import FadeIn from '../common/FadeIn';
import dashboardService from '../../services/dashboardService';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const StatsGrid = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await dashboardService.getStats();
                setStats(response.data);
            } catch (error) {
                // Error handled silently; empty stats grid renders
                console.error("Failed to fetch stats:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) return <div className="h-32 bg-gray-50/50 rounded-2xl animate-pulse mb-10"></div>;

    const getColor = (colorString) => {
        // Extract 'blue' from 'text-blue-600'
        return colorString.split('-')[1] || 'indigo';
    };

    const colorMap = {
        blue: {
            blob: 'bg-blue-500/5 group-hover:bg-blue-500/10',
            iconBg: 'bg-blue-50 dark:bg-blue-500/10',
            iconText: 'text-blue-600 dark:text-blue-400',
        },
        indigo: {
            blob: 'bg-indigo-500/5 group-hover:bg-indigo-500/10',
            iconBg: 'bg-indigo-50 dark:bg-indigo-500/10',
            iconText: 'text-indigo-600 dark:text-indigo-400',
        },
        emerald: {
            blob: 'bg-emerald-500/5 group-hover:bg-emerald-500/10',
            iconBg: 'bg-emerald-50 dark:bg-emerald-500/10',
            iconText: 'text-emerald-600 dark:text-emerald-400',
        },
        cyan: {
            blob: 'bg-cyan-500/5 group-hover:bg-cyan-500/10',
            iconBg: 'bg-cyan-50 dark:bg-cyan-500/10',
            iconText: 'text-cyan-600 dark:text-cyan-400',
        },
    };

    return (
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            {stats.map((stat, idx) => {
                const colorKey = getColor(stat.color);
                const colorStyles = colorMap[colorKey] || colorMap.indigo;

                return (
                    <FadeIn
                        key={idx}
                        delay={idx * 0.1}
                        direction="up"
                        className="h-full"
                    >
                        <div
                            onClick={() => navigate(stat.link)}
                            className="bg-white dark:bg-gray-900/50 backdrop-blur-xl p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-xl hover:shadow-gray-200/50 dark:hover:shadow-black/50 hover:-translate-y-1 transition-all cursor-pointer group h-full relative overflow-hidden"
                        >
                            {/* Decorative gradient blob */}
                            <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl transition-colors ${colorStyles.blob}`}></div>

                            <div className="flex items-center justify-between relative z-10">
                                <div className={`p-3.5 rounded-xl group-hover:scale-110 transition-transform ${colorStyles.iconBg} ${colorStyles.iconText}`}>
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={stat.icon} />
                                    </svg>
                                </div>
                                <span className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">{stat.value}</span>
                            </div>
                            <p className="mt-4 text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors relative z-10">{stat.label}</p>
                        </div>
                    </FadeIn>
                );
            })}
        </section>
    );
};

export default StatsGrid;
