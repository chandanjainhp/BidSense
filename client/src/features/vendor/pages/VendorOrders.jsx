import React, { useState } from 'react';
import { orderApi } from '../api/vendorApi';
import { useFetch } from '../hooks/useVendor';
import { useToast } from '../../../context/ToastContext';
import { PageHeader, Card, EmptyState, LoadingState, PrimaryButton, SecondaryButton } from '../components/common';
import { StatusBadge, formatCurrency, formatDateTime } from '../utils/format.jsx';

// Allowed next statuses per order state (mirrors backend transitions)
const NEXT_STATUSES = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['processing', 'cancelled'],
    processing: ['shipped', 'cancelled'],
    shipped: ['delivered'],
    delivered: ['completed'],
    completed: [],
    cancelled: [],
};

const VendorOrders = () => {
    const { success, error: showError } = useToast();
    const { data, loading, reload } = useFetch(() => orderApi.listMine({ page_size: 100 }), []);
    const [filter, setFilter] = useState('all');
    const [updatingId, setUpdatingId] = useState(null);

    const orders = data?.items || [];
    const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter);

    const updateStatus = async (order, status) => {
        setUpdatingId(order.id);
        try {
            await orderApi.updateStatus(order.id, status);
            success(`Order marked as ${status}`);
            reload();
        } catch (err) {
            showError(err?.response?.data?.detail || 'Status update failed');
        } finally {
            setUpdatingId(null);
        }
    };

    return (
        <div className="p-6 lg:p-10">
            <PageHeader title="Orders" subtitle="Orders created from accepted quotations" />

            <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
                {['all', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'completed', 'cancelled'].map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${filter === f
                            ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                            : 'bg-white dark:bg-gray-900/50 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-800 hover:border-gray-300'
                            }`}
                    >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                        {f !== 'all' && <span className="ml-1.5 text-xs opacity-60">{orders.filter(o => o.status === f).length}</span>}
                    </button>
                ))}
            </div>

            {loading ? (
                <LoadingState />
            ) : filtered.length === 0 ? (
                <Card>
                    <EmptyState
                        icon="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                        title={filter === 'all' ? 'No orders yet' : `No ${filter} orders`}
                        subtitle="When buyers accept your quotations, orders appear here."
                    />
                </Card>
            ) : (
                <div className="space-y-4">
                    {filtered.map((order) => (
                        <Card key={order.id} className="p-5">
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                        <h3 className="font-bold text-gray-900 dark:text-white font-mono text-sm">{order.order_number}</h3>
                                        <StatusBadge status={order.status} />
                                    </div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {order.quotation?.items?.[0]?.name || 'Items'} • Placed {formatDateTime(order.created_at)}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1 truncate">📍 {order.delivery_location}</p>
                                </div>

                                <div className="flex items-center gap-3 flex-shrink-0">
                                    <div className="text-right">
                                        <p className="text-xs text-gray-400 uppercase tracking-wider font-bold">Total</p>
                                        <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(order.total_amount)}</p>
                                    </div>

                                    {NEXT_STATUSES[order.status]?.length > 0 && (
                                        <div className="flex gap-2">
                                            {NEXT_STATUSES[order.status].map(next => (
                                                next === 'cancelled' ? (
                                                    <SecondaryButton
                                                        key={next}
                                                        onClick={() => updateStatus(order, next)}
                                                        disabled={updatingId === order.id}
                                                        className="!px-3 !py-2 text-xs !text-red-600 !border-red-200 dark:!border-red-500/30 hover:!border-red-400"
                                                    >
                                                        Cancel Order
                                                    </SecondaryButton>
                                                ) : (
                                                    <PrimaryButton
                                                        key={next}
                                                        onClick={() => updateStatus(order, next)}
                                                        disabled={updatingId === order.id}
                                                        className="!px-3 !py-2 text-xs capitalize"
                                                    >
                                                        Mark {next}
                                                    </PrimaryButton>
                                                )
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

export default VendorOrders;
