import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { vendorApi } from '../api/vendorApi';
import { useFetch } from '../hooks/useVendor';
import { Card, EmptyState, LoadingState, inputClasses } from '../components/common';
import { formatCurrency } from '../utils/format.jsx';

const MarketplacePage = () => {
    const [search, setSearch] = useState('');
    const [query, setQuery] = useState('');
    const { data, loading } = useFetch(() => vendorApi.getPublicStores({ search: query, page_size: 60 }), [query]);

    const vendors = data?.items || [];

    const handleSubmit = (e) => {
        e.preventDefault();
        setQuery(search);
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-black">
            {/* Header */}
            <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 dark:from-gray-900 dark:via-gray-900 dark:to-black">
                <div className="max-w-6xl mx-auto px-6 py-16 text-center">
                    <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">Vendor Marketplace</h1>
                    <p className="text-indigo-100 dark:text-gray-400 max-w-2xl mx-auto mb-8">
                        Discover verified suppliers, compare products and services, and request bulk quotes directly.
                    </p>
                    <form onSubmit={handleSubmit} className="max-w-xl mx-auto flex gap-2">
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search vendors, categories…"
                            className="flex-1 px-5 py-3.5 rounded-xl bg-white/95 dark:bg-gray-800 text-gray-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-white/40"
                        />
                        <button type="submit" className="px-6 py-3.5 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-bold hover:opacity-90">
                            Search
                        </button>
                    </form>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-6 py-12">
                {loading ? (
                    <LoadingState />
                ) : vendors.length === 0 ? (
                    <Card className="p-0">
                        <EmptyState
                            icon="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                            title="No vendors found"
                            subtitle={query ? `Nothing matches "${query}". Try a different search.` : 'Verified vendors will appear here as they join the marketplace.'}
                        />
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {vendors.map((v) => (
                            <Link key={v.id} to={`/marketplace/${v.id}`} className="group">
                                <Card className="p-6 h-full group-hover:-translate-y-1 group-hover:shadow-xl transition-all">
                                    <div className="flex items-start justify-between mb-4">
                                        {v.logo_url ? (
                                            <img src={v.logo_url} alt={v.business_name} className="w-14 h-14 rounded-xl object-cover" />
                                        ) : (
                                            <div className="w-14 h-14 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-xl font-bold text-indigo-600 dark:text-indigo-400">
                                                {v.business_name?.charAt(0)}
                                            </div>
                                        )}
                                        {v.status === 'verified' && (
                                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded-full">
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                Verified
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 transition-colors">{v.business_name}</h3>
                                    <p className="text-xs text-gray-400 mt-0.5">{v.business_category}{v.city ? ` • ${v.city}` : ''}{v.state ? `, ${v.state}` : ''}</p>
                                    {v.description && (
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-3 line-clamp-2">{v.description}</p>
                                    )}
                                    {v.certifications?.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mt-4">
                                            {v.certifications.slice(0, 3).map((c, i) => (
                                                <span key={i} className="text-[11px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-1 rounded-md">
                                                    {c}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </Card>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MarketplacePage;
