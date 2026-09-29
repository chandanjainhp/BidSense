import React from 'react';
import { quotationApi } from '../api/vendorApi';
import { useFetch } from '../hooks/useVendor';
import { PageHeader, Card, EmptyState, LoadingState } from '../components/common';
import { StatusBadge, formatCurrency, formatDateTime, formatNumber } from '../utils/format.jsx';

const VendorQuotations = () => {
    const { data, loading } = useFetch(() => quotationApi.listMine({ page_size: 100 }), []);
    const quotations = data?.items || [];

    return (
        <div className="p-6 lg:p-10">
            <PageHeader title="Quotations" subtitle="Quotes you've sent to buyers" />

            {loading ? (
                <LoadingState />
            ) : quotations.length === 0 ? (
                <Card>
                    <EmptyState
                        icon="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        title="No quotations yet"
                        subtitle="Quotations you create in response to buyer inquiries will appear here."
                    />
                </Card>
            ) : (
                <div className="space-y-4">
                    {quotations.map((q) => (
                        <Card key={q.id} className="p-5">
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                        <h3 className="font-bold text-gray-900 dark:text-white font-mono text-sm">{q.quotation_number}</h3>
                                        <StatusBadge status={q.status} />
                                    </div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {q.items?.[0]?.name || 'Items'} • {formatNumber(q.quantity)} units • Sent {formatDateTime(q.created_at)}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1">
                                        Unit {formatCurrency(q.unit_price)}
                                        {Number(q.bulk_discount_percent) > 0 && ` • ${q.bulk_discount_percent}% discount`}
                                        {q.tax_percent ? ` • ${q.tax_percent}% tax` : ''}
                                        {q.delivery_time && ` • ${q.delivery_time}`}
                                        {q.valid_until && ` • Valid until ${formatDateTime(q.valid_until)}`}
                                    </p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <p className="text-xs text-gray-400 uppercase tracking-wider font-bold">Total</p>
                                    <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(q.total_amount)}</p>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

export default VendorQuotations;
