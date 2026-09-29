import React, { useState } from 'react';

const ProposalTable = ({ proposals, totalCount, filteredCount, onReview }) => {
    const [openMenuId, setOpenMenuId] = useState(null);

    const toggleMenu = (id) => {
        setOpenMenuId(openMenuId === id ? null : id);
    };

    return (
        <div className="bg-white dark:bg-gray-900/50 backdrop-blur-xl rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden transition-colors">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-white/5">
                            <th className="px-6 py-5 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Vendor & RFP</th>
                            <th className="px-6 py-5 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest text-center">BidSense Score</th>
                            <th className="px-6 py-5 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Budget</th>
                            <th className="px-6 py-5 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Status</th>
                            <th className="px-6 py-5 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">AI Quick Insight</th>
                            <th className="px-6 py-5 text-right text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                        {proposals.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-16 text-center">
                                    <div className="flex flex-col items-center gap-2">
                                        <svg className="w-10 h-10 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                        <p className="font-bold text-gray-500 dark:text-gray-400">No proposals match your search</p>
                                        <p className="text-sm text-gray-400 dark:text-gray-500">Try a different vendor name, RFP title, or status filter.</p>
                                    </div>
                                </td>
                            </tr>
                        ) : proposals.map((item) => (
                            <tr key={item.id} className="hover:bg-indigo-50/50 dark:hover:bg-indigo-500/10 transition-colors group cursor-default">
                                <td className="px-6 py-5">
                                    <p className="font-bold text-gray-900 dark:text-white">{item.vendor}</p>
                                    <p className="text-xs text-indigo-500 dark:text-indigo-400 font-semibold">{item.rfp}</p>
                                </td>
                                <td className="px-6 py-5 text-center">
                                    {item.score ? (
                                        <div className="inline-flex flex-col items-center">
                                            <span className={`text-xl font-black ${item.score > 85 ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
                                                {item.score}
                                            </span>
                                            <div className="w-12 h-1 bg-gray-100 dark:bg-gray-700 rounded-full mt-1 overflow-hidden">
                                                <div
                                                    className={`h-full ${item.score > 85 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                                                    style={{ width: `${item.score}%` }}
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <span className="text-gray-300 dark:text-gray-600 text-xs font-bold italic tracking-tighter">Processing...</span>
                                    )}
                                </td>
                                <td className="px-6 py-5">
                                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{item.amount}</span>
                                </td>
                                <td className="px-6 py-5">
                                    <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${item.status === 'Scored' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20' :
                                        item.status === 'Under Review' ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-500/20' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                                        }`}>
                                        {item.status}
                                    </span>
                                </td>
                                <td className="px-6 py-5">
                                    <div className="flex items-center space-x-2">
                                        <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                                        <span className="text-sm text-gray-600 dark:text-gray-400 font-medium italic">"{item.aiInsight}"</span>
                                    </div>
                                </td>
                                <td className="px-6 py-5 text-right relative">
                                    <button
                                        onClick={() => toggleMenu(item.id)}
                                        className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
                                    </button>

                                    {/* Dropdown Menu */}
                                    {openMenuId === item.id && (
                                        <div className="absolute right-8 top-12 z-50 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 py-2 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                                            <button
                                                onClick={() => { onReview(item); setOpenMenuId(null); }}
                                                className="w-full flex items-center px-4 py-2 text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                            >
                                                <svg className="w-4 h-4 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                Review Details
                                            </button>
                                            <button
                                                className="w-full flex items-center px-4 py-2 text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                                            >
                                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                                Accept Proposal
                                            </button>
                                            <button
                                                className="w-full flex items-center px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                            >
                                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                                Reject Proposal
                                            </button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination Placeholder */}
            <div className="p-6 bg-gray-50/30 dark:bg-gray-800/30 border-t border-gray-100 dark:border-white/5 flex items-center justify-between">
                <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Showing {filteredCount} of {totalCount} proposal{totalCount === 1 ? '' : 's'}</span>
                <div className="flex space-x-2">
                    <button className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-white dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-all disabled:opacity-30" disabled>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <button className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-white dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-all">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProposalTable;
