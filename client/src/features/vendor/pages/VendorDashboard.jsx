import React from 'react';
import { Link } from 'react-router-dom';
import { vendorApi } from '../api/vendorApi';
import { useFetch } from '../hooks/useVendor';
import { PageHeader, StatCard, Card, EmptyState, LoadingState } from '../components/common';
import { useVendorProfile } from '../hooks/useVendor';
import { formatCurrency, formatDateTime, StatusBadge } from '../utils/format.jsx';

const VendorDashboard = () => {
    const { vendor } = useVendorProfile();
    const { data: stats, loading } = useFetch(() => vendorApi.getDashboard(), []);

    if (loading) {
        return (
            <div className="p-6 lg:p-10">
                <div className="h-10 w-64 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse mb-8" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="h-28 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    const s = stats || {};

    return (
        <div className="p-6 lg:p-10">
            <PageHeader
                title={`Welcome back${vendor ? `, ${vendor.contact_name}` : ''}`}
                subtitle="Here's what's happening with your storefront"
                actions={
                    <Link to="/vendor/products/new" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-lg hover:opacity-90 transition-opacity">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                        New Product
                    </Link>
                }
            />

            {/* Verification banner */}
            {vendor?.status === 'pending' && (
                <div className="mb-8 rounded-2xl border border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/10 p-4 flex items-start gap-3">
                    <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div>
                        <p className="text-sm font-bold text-amber-800 dark:text-amber-400">Verification in progress</p>
                        <p className="text-xs text-amber-700 dark:text-amber-400/80 mt-0.5">
                            Your profile is being reviewed. You can prepare listings now — they go public once you're verified.
                        </p>
                    </div>
                </div>
            )}

            {/* Stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
                <StatCard label="Total Products" value={s.total_products ?? 0} icon="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" color="indigo" />
                <StatCard label="Total Services" value={s.total_services ?? 0} icon="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" color="cyan" />
                <StatCard label="Active Listings" value={s.active_listings ?? 0} icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" color="emerald" />
                <StatCard label="Bulk-Sale Listings" value={s.bulk_sale_listings ?? 0} icon="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" color="blue" />
                <StatCard label="Pending Inquiries" value={s.pending_inquiries ?? 0} icon="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" color="amber" onClick={() => window.location.assign('/vendor/inquiries')} />
                <StatCard label="Quotes Awaiting Reply" value={s.pending_quotations ?? 0} icon="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" color="rose" onClick={() => window.location.assign('/vendor/quotations')} />
                <StatCard label="Active Orders" value={s.active_orders ?? 0} icon="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" color="blue" onClick={() => window.location.assign('/vendor/orders')} />
                <StatCard label="Completed Orders" value={s.completed_orders ?? 0} icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" color="emerald" />
            </div>

            {/* Revenue + activity */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-1 p-6">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Total Revenue</p>
                    <p className="text-4xl font-bold text-gray-900 dark:text-white mt-3">
                        {formatCurrency(s.revenue ?? 0)}
                    </p>
                    <p className="text-xs text-gray-400 mt-2">From delivered & completed orders</p>
                    <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800 grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Completed</p>
                            <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">{s.completed_orders ?? 0}</p>
                        </div>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">In Progress</p>
                            <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">{s.active_orders ?? 0}</p>
                        </div>
                    </div>
                </Card>

                <Card className="lg:col-span-2 p-6">
                    <div className="flex items-center justify-between mb-5">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">Recent Activity</h3>
                    </div>
                    {(s.recent_activity || []).length === 0 ? (
                        <EmptyState
                            title="No activity yet"
                            subtitle="Publish listings and share your store to start receiving inquiries."
                        />
                    ) : (
                        <div className="space-y-3">
                            {(s.recent_activity || []).map((a, i) => (
                                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/40">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${a.type === 'inquiry' ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600' : 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600'}`}>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                    d={a.type === 'inquiry'
                                                        ? 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z'
                                                        : 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z'} />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white capitalize">
                                                {a.type === 'order' ? `Order ${a.order_number?.slice(-6)}` : `New inquiry (${a.quantity} units)`}
                                            </p>
                                            <p className="text-xs text-gray-400">{formatDateTime(a.created_at)}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {a.type === 'order' && (
                                            <span className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(a.total)}</span>
                                        )}
                                        <StatusBadge status={a.status} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
};

export default VendorDashboard;
