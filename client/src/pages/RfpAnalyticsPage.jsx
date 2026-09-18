import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import PageTransition from '../components/common/PageTransition';
import SEO from '../components/common/SEO';
import rfpService from '../services/rfpService';

const RfpAnalyticsPage = () => {
    const [searchParams] = useSearchParams();
    const rfpId = searchParams.get('id');
    const navigate = useNavigate();

    const [timeRange, setTimeRange] = useState('7d');
    const [analyticsData, setAnalyticsData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(rfpId ? null : 'No RFP selected. Pick an RFP from the list first.');

    useEffect(() => {
        if (!rfpId) {
            return;
        }
        const fetchAnalytics = async () => {
            try {
                const response = await rfpService.getAnalytics(rfpId);
                const a = response.data;
                const fmt = (v) => (v != null ? `$${Number(v).toLocaleString()}` : '—');
                setAnalyticsData({
                    totalBids: a.submitted_count ?? 0,
                    avgBidAmount: fmt(a.avg_bid_amount),
                    lowestBid: fmt(a.lowest_bid_amount),
                    highestBid: fmt(a.highest_bid_amount),
                    vendorsInvited: a.total_invitations ?? 0,
                    vendorsViewed: a.viewed_count ?? 0,
                    vendorsBidding: a.started_count ?? 0,
                    vendorsDeclined: a.declined_count ?? 0,
                });
            } catch (err) {
                console.error('Failed to fetch analytics:', err);
                setError('Failed to load analytics for this RFP.');
            } finally {
                setLoading(false);
            }
        };
        fetchAnalytics();
    }, [rfpId]);

    return (
        <PageTransition>
            <SEO title={`Analytics: #${rfpId} | BidSense`} description="Detailed analytics for your Request for Proposal." />

            <div className="p-6 md:p-8 max-w-7xl mx-auto min-h-screen space-y-8 bg-gray-50 dark:bg-black transition-colors duration-300">
                {/* Header */}
                <div className="flex flex-col gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                            </button>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">RFP Analytics</h1>
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 text-sm ml-7">Evaluating performance for <span className="font-mono font-medium text-indigo-600 dark:text-indigo-400">#{rfpId}</span></p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                        <div className="bg-white dark:bg-gray-900 p-1 rounded-lg border border-gray-200 dark:border-gray-800 flex">
                            {['24h', '7d', '30d'].map(range => (
                                <button
                                    key={range}
                                    onClick={() => setTimeRange(range)}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${timeRange === range ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
                                >
                                    {range}
                                </button>
                            ))}
                        </div>
                        <button className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-colors shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            Export Report
                        </button>
                    </div>
                </div>

                {/* KPI Cards */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-white dark:bg-gray-900 rounded-2xl animate-pulse" />)}
                    </div>
                ) : error || !analyticsData ? (
                    <p className="text-red-500 text-sm">{error || 'No analytics available.'}</p>
                ) : (<>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <KpiCard title="Total Bids" value={analyticsData.totalBids} trend={`${analyticsData.vendorsInvited} invited`} icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" color="indigo" />
                    <KpiCard title="Avg. Bid Amount" value={analyticsData.avgBidAmount} trend="Across all bids" icon="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" color="emerald" />
                    <KpiCard title="Lowest Bid" value={analyticsData.lowestBid} trend="Best Offer" icon="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" color="blue" />
                    <KpiCard title="Highest Bid" value={analyticsData.highestBid} trend="Top range" icon="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" color="amber" />
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Vendor Funnel */}
                    <div className="lg:col-span-2 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Vendor Funnel</h3>
                        <div className="space-y-6">
                            <FunnelStage label="Invited" count={analyticsData.vendorsInvited} total={analyticsData.vendorsInvited || 1} color="bg-gray-200 dark:bg-gray-700" />
                            <FunnelStage label="Viewed RFP" count={analyticsData.vendorsViewed} total={analyticsData.vendorsInvited || 1} color="bg-blue-200 dark:bg-blue-900" />
                            <FunnelStage label="Started Draft" count={analyticsData.vendorsBidding} total={analyticsData.vendorsInvited || 1} color="bg-indigo-300 dark:bg-indigo-800" />
                            <FunnelStage label="Submitted Bid" count={analyticsData.totalBids} total={analyticsData.vendorsInvited || 1} color="bg-emerald-400 dark:bg-emerald-600" />
                        </div>
                    </div>

                    {/* Summary Card */}
                    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Bid Summary</h3>
                        <div className="space-y-4">
                            <SummaryRow label="Avg Bid" value={analyticsData.avgBidAmount} />
                            <SummaryRow label="Lowest Bid" value={analyticsData.lowestBid} />
                            <SummaryRow label="Highest Bid" value={analyticsData.highestBid} />
                            <SummaryRow label="Declined" value={String(analyticsData.vendorsDeclined)} />
                        </div>
                    </div>
                </div>
                </>)}
            </div>
        </PageTransition>
    );
};

// Helper Components
const KpiCard = ({ title, value, trend, icon, color }) => {
    const colorMap = {
        indigo: {
            bg: 'bg-indigo-50 dark:bg-indigo-500/10',
            text: 'text-indigo-600 dark:text-indigo-400',
        },
        emerald: {
            bg: 'bg-emerald-50 dark:bg-emerald-500/10',
            text: 'text-emerald-600 dark:text-emerald-400',
        },
        blue: {
            bg: 'bg-blue-50 dark:bg-blue-500/10',
            text: 'text-blue-600 dark:text-blue-400',
        },
        amber: {
            bg: 'bg-amber-50 dark:bg-amber-500/10',
            text: 'text-amber-600 dark:text-amber-400',
        },
    };

    const colorStyles = colorMap[color] || colorMap.indigo;

    return (
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 flex items-start justify-between shadow-sm hover:shadow-md transition-shadow">
            <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{title}</p>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-1">{value}</h3>
                <span className={`text-xs font-bold ${trend.includes('+') ? 'text-emerald-500' : 'text-gray-400'}`}>{trend}</span>
            </div>
            <div className={`p-3 rounded-xl ${colorStyles.bg} ${colorStyles.text}`}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={icon} /></svg>
            </div>
        </div>
    );
};

const FunnelStage = ({ label, count, total, color }) => {
    const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
    return (
        <div>
            <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-gray-600 dark:text-gray-300">{label}</span>
                <span className="font-bold text-gray-900 dark:text-white">{count} ({percentage}%)</span>
            </div>
            <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div className={`h-full ${color} rounded-full`} style={{ width: `${percentage}%` }}></div>
            </div>
        </div>
    );
};

const SummaryRow = ({ label, value }) => (
    <div className="flex justify-between items-center py-2 border-b border-gray-50 dark:border-gray-800 last:border-0">
        <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
        <span className="text-sm font-bold text-gray-900 dark:text-white">{value}</span>
    </div>
);

export default RfpAnalyticsPage;
