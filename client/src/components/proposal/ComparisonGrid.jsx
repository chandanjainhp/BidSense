import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import proposalService from '../../services/proposalService';

const ComparisonGrid = ({ proposalIds }) => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    // IDs come from props or ?ids=a,b,c query params
    const ids = proposalIds || (searchParams.get('ids') || '').split(',').filter(Boolean);

    const [vendors, setVendors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(ids.length === 0 ? 'No proposals selected to compare.' : null);

    useEffect(() => {
        if (ids.length === 0) {
            return;
        }
        const fetchComparison = async () => {
            try {
                const response = await proposalService.compare(ids);
                const items = response.data.proposals || [];
                // Rank by AI score (nulls last) to pick the winner
                const ranked = [...items].sort((a, b) => (b.ai_score ?? -1) - (a.ai_score ?? -1));
                setVendors(ranked.map((p, idx) => ({
                    id: p.id,
                    name: p.vendor_name || 'Unknown vendor',
                    score: p.ai_score != null ? Math.round(p.ai_score) : null,
                    technicalScore: p.technical_score != null ? Math.round(p.technical_score) : null,
                    pricingScore: p.pricing_score != null ? Math.round(p.pricing_score) : null,
                    experienceScore: p.experience_score != null ? Math.round(p.experience_score) : null,
                    cost: p.amount != null ? `$${Number(p.amount).toLocaleString()}` : '—',
                    aiSummary: p.ai_summary || 'No AI analysis yet — score this proposal to generate insights.',
                    isWinner: idx === 0 && ranked[0].ai_score != null,
                })));
            } catch (err) {
                console.error('Failed to fetch comparison:', err);
                setError('Failed to load comparison data.');
            } finally {
                setLoading(false);
            }
        };
        fetchComparison();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams.get('ids')]);

    const features = [
        { label: 'AI Score', key: 'score', type: 'score' },
        { label: 'Technical Score', key: 'technicalScore', type: 'score' },
        { label: 'Pricing Score', key: 'pricingScore', type: 'score' },
        { label: 'Total Cost', key: 'cost', type: 'text' },
        { label: 'AI Summary', key: 'aiSummary', type: 'text' },
    ];

    if (loading) {
        return <div className="h-64 bg-white dark:bg-gray-900 rounded-3xl animate-pulse" />;
    }

    if (error || vendors.length === 0) {
        return (
            <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-12 text-center">
                <p className="text-gray-500 dark:text-gray-400">{error || 'Nothing to compare yet.'}</p>
                <p className="text-xs text-gray-400 mt-2">Select proposals from the inbox and compare them via <span className="font-mono">/proposals/compare?ids=&lt;id1&gt;,&lt;id2&gt;</span></p>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700">
                            <th className="p-6 min-w-[200px] border-r border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 sticky left-0 z-10 shadow-sm">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Comparison Criteria</span>
                            </th>
                            {vendors.map((vendor, colIdx) => (
                                <th key={vendor.id} className={`p-6 min-w-[250px] relative ${vendor.isWinner ? 'bg-indigo-50/30 dark:bg-indigo-900/10' : ''}`}>
                                    {vendor.isWinner && (
                                        <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-3 py-1 rounded-full shadow-sm border border-yellow-200 z-20 flex items-center gap-1">
                                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                                            Best Match
                                        </div>
                                    )}
                                    <div className="flex flex-col items-center text-center pt-4">
                                        <div className={`w-14 h-14 rounded-2xl mb-3 shadow-inner flex items-center justify-center text-xl font-black ${colIdx === 0 ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white' : colIdx === 1 ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white' : 'bg-gradient-to-br from-amber-500 to-amber-600 text-white'}`}>
                                            {vendor.name.charAt(0)}
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{vendor.name}</h3>
                                        <span className="text-xs text-gray-500 font-medium">Verified Vendor</span>
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {features.map((feature, idx) => (
                            <tr key={idx} className="group hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                                <td className="p-6 border-r border-gray-100 dark:border-gray-800 font-bold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 sticky left-0 z-10 group-hover:bg-gray-50 dark:group-hover:bg-gray-800 transition-colors shadow-sm">
                                    {feature.label}
                                </td>
                                {vendors.map((vendor) => (
                                    <td key={`${vendor.id}-${feature.key}`} className={`p-6 text-center ${vendor.isWinner ? 'bg-indigo-50/10 dark:bg-indigo-900/5' : ''}`}>

                                        {/* Score Rendering */}
                                        {feature.type === 'score' && (
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="relative w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden max-w-[120px]">
                                                    <div
                                                        className={`absolute top-0 left-0 h-full rounded-full ${(vendor[feature.key] ?? 0) >= 90 ? 'bg-emerald-500' : (vendor[feature.key] ?? 0) >= 80 ? 'bg-indigo-500' : 'bg-amber-500'}`}
                                                        style={{ width: `${vendor[feature.key] ?? 0}%` }}
                                                    ></div>
                                                </div>
                                                <span className="text-xl font-black text-gray-900 dark:text-white">{vendor[feature.key] ?? '—'}</span>
                                            </div>
                                        )}

                                        {/* Text Rendering */}
                                        {feature.type === 'text' && (
                                            <span className="font-semibold text-gray-700 dark:text-gray-300">{vendor[feature.key]}</span>
                                        )}

                                        {/* Badge Rendering (unused with live data but kept for reuse) */}
                                        {feature.type === 'badge' && (
                                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-100 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20">
                                                {vendor[feature.key]}
                                            </span>
                                        )}

                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="p-6 bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 flex justify-center transition-colors">
                <button
                    onClick={() => navigate('/rfps/analytics')}
                    className="text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline flex items-center gap-2 transition-colors"
                >
                    View Full Analysis Details
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                </button>
            </div>
        </div>
    );
};

export default ComparisonGrid;
