import React, { useState, useEffect } from 'react';
import vendorService from '../../services/vendorService';

const VendorMetrics = () => {
    const [metrics, setMetrics] = useState(null);

    useEffect(() => {
        let cancelled = false;
        vendorService.getMetrics()
            .then((res) => { if (!cancelled) setMetrics(res.data); })
            .catch((err) => console.error('Failed to fetch vendor metrics:', err));
        return () => { cancelled = true; };
    }, []);

    const stats = metrics ? [
        { label: "Total Vendors", value: String(metrics.total), trend: `${metrics.active} active`, color: "indigo" },
        { label: "Pending Approvals", value: String(metrics.pending), trend: metrics.pending > 0 ? "Needs Attn" : "All Clear", color: "amber" },
        { label: "Inactive", value: String(metrics.inactive), trend: `${Object.keys(metrics.industry_breakdown || {}).length} industries`, color: "emerald" }
    ] : [];

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {stats.length === 0 ? (
                [1, 2, 3].map(i => (
                    <div key={i} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-6 rounded-2xl shadow-sm animate-pulse h-28" />
                ))
            ) : stats.map((stat, idx) => (
                <div key={idx} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-6 rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                    <p className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide">{stat.label}</p>
                    <div className="flex items-baseline mt-2">
                        <span className="text-3xl font-black text-gray-900 dark:text-white">{stat.value}</span>
                        <span className={`ml-3 text-xs font-bold px-2 py-0.5 rounded-full ${stat.color === 'emerald' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : stat.color === 'amber' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'}`}>
                            {stat.trend}
                        </span>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default VendorMetrics;
