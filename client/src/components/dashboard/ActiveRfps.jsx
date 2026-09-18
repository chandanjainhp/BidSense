import React from 'react';
import { useNavigate } from 'react-router-dom';

import { useState, useEffect } from 'react';
import rfpService from '../../services/rfpService';

const ActiveRfps = () => {
    const navigate = useNavigate();
    const [activeRFPs, setActiveRFPs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedRfpId, setExpandedRfpId] = useState(null);

    useEffect(() => {
        const fetchRFPs = async () => {
            try {
                const response = await rfpService.getAll();
                // Adapter: FastAPI returns { items, total }; service unwraps to { data, total }.
                // Map vendorCount to vendors and dueDate to deadline for the UI.
                const mappedData = response.data.map(rfp => ({
                    ...rfp,
                    vendors: rfp.vendorCount,
                    deadline: rfp.deadline || rfp.dueDate,
                }));
                setActiveRFPs(mappedData);
            } catch (error) {
                console.error("Failed to fetch RFPs:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchRFPs();
    }, []);

    const toggleRow = (id) => {
        if (expandedRfpId === id) {
            setExpandedRfpId(null);
        } else {
            setExpandedRfpId(id);
        }
    };

    return (
        <div className="bg-white dark:bg-gray-900/50 backdrop-blur-xl rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    </span>
                    Active RFPs
                </h2>
                <button
                    onClick={() => navigate('/rfps')}
                    className="text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors"
                >
                    View All
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50/50 dark:bg-white/5 border-b border-gray-100 dark:border-white/5">
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">RFP Title</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">Vendors</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Deadline</th>
                            <th className="px-6 py-4"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                        {loading ? (
                            [1, 2, 3].map(i => (
                                <tr key={i} className="animate-pulse">
                                    <td colSpan="5" className="px-6 py-4">
                                        <div className="h-4 bg-gray-100 dark:bg-white/5 rounded w-full"></div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            activeRFPs.map((rfp) => (
                                <React.Fragment key={rfp.id}>
                                    <tr
                                        onClick={() => toggleRow(rfp.id)}
                                        className={`hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors group cursor-pointer ${expandedRfpId === rfp.id ? 'bg-gray-50/80 dark:bg-white/5' : ''}`}
                                    >
                                        <td className="px-6 py-4">
                                            <span className="font-bold text-gray-800 dark:text-gray-200 block">{rfp.title}</span>
                                            <span className="text-xs text-gray-400 font-medium">ID: #{String(rfp.id).substring(0, 8).toUpperCase()}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${rfp.status === 'Open' ? 'bg-emerald-50 border-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400' :
                                                rfp.status === 'Evaluation' ? 'bg-blue-50 border-blue-100 text-blue-700 dark:bg-blue-500/10 dark:border-blue-500/20 dark:text-blue-400' : 'bg-amber-50 border-amber-100 text-amber-700 dark:bg-amber-500/10 dark:border-amber-500/20 dark:text-amber-400'
                                                }`}>
                                                {rfp.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex -space-x-2 justify-center overflow-hidden">
                                                {[...Array(Math.min(3, rfp.vendors))].map((_, i) => (
                                                    <div key={i} className="inline-block h-6 w-6 rounded-full ring-2 ring-white dark:ring-gray-900 bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[10px] font-bold text-gray-500">
                                                        {String.fromCharCode(65 + i)}
                                                    </div>
                                                ))}
                                                {rfp.vendors > 3 && (
                                                    <div className="inline-block h-6 w-6 rounded-full ring-2 ring-white dark:ring-gray-900 bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-[9px] font-bold text-gray-500">+{rfp.vendors - 3}</div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-sm font-medium">{rfp.deadline}</td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); toggleRow(rfp.id); }}
                                                className={`p-2 text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-all ${expandedRfpId === rfp.id ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10 rotate-90' : ''}`}
                                            >
                                                <svg className={`w-5 h-5 transition-transform duration-300 ${expandedRfpId === rfp.id ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                                            </button>
                                        </td>
                                    </tr>
                                    {expandedRfpId === rfp.id && (
                                        <tr className="bg-gray-50/50 dark:bg-white/5 animate-in fade-in slide-in-from-top-2 duration-200">
                                            <td colSpan="5" className="px-6 py-4">
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Project Description</h4>
                                                        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-2xl">{rfp.description || "No description available for this project."}</p>
                                                        <div className="mt-4 flex gap-4">
                                                            <div>
                                                                <span className="text-xs text-gray-400 uppercase font-bold">Budget</span>
                                                                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{rfp.budget || "$50k - $100k"}</p>
                                                            </div>
                                                            <div>
                                                                <span className="text-xs text-gray-400 uppercase font-bold">Department</span>
                                                                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{rfp.department || "IT"}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col gap-2">
                                                        <button
                                                            onClick={() => navigate(`/rfps/editor?id=${rfp.id}`)}
                                                            className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20"
                                                        >
                                                            Manage RFP
                                                        </button>
                                                        <button
                                                            onClick={() => navigate(`/rfps/analytics?id=${rfp.id}`)}
                                                            className="px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 text-sm font-bold rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                                        >
                                                            View Analytics
                                                        </button>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ActiveRfps;
