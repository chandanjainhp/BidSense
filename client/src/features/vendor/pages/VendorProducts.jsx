import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { productApi } from '../api/vendorApi';
import { useFetch } from '../hooks/useVendor';
import { useToast } from '../../../context/ToastContext';
import { PageHeader, Card, EmptyState, LoadingState, PrimaryButton, SecondaryButton } from '../components/common';
import { StatusBadge, formatCurrency, formatNumber } from '../utils/format.jsx';

const VendorProducts = () => {
    const navigate = useNavigate();
    const { success, error: showError } = useToast();
    const { data, loading, reload } = useFetch(() => productApi.list({ page_size: 100 }), []);

    const products = data?.items || [];

    const togglePublish = async (p) => {
        const next = p.status === 'published' ? 'unpublished' : 'published';
        try {
            await productApi.update(p.id, { status: next });
            success(next === 'published' ? 'Product published' : 'Product unpublished');
            reload();
        } catch (err) {
            showError(err?.response?.data?.detail || 'Update failed');
        }
    };

    const handleDelete = async (p) => {
        if (!window.confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
        try {
            await productApi.remove(p.id);
            success('Product deleted');
            reload();
        } catch (err) {
            showError(err?.response?.data?.detail || 'Delete failed');
        }
    };

    return (
        <div className="p-6 lg:p-10">
            <PageHeader
                title="Products"
                subtitle={`${products.length} listing${products.length === 1 ? '' : 's'}`}
                actions={
                    <PrimaryButton onClick={() => navigate('/vendor/products/new')}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                        Add Product
                    </PrimaryButton>
                }
            />

            {loading ? (
                <LoadingState />
            ) : products.length === 0 ? (
                <Card>
                    <EmptyState
                        title="No products yet"
                        subtitle="Create your first product listing to appear on the marketplace."
                        action={
                            <PrimaryButton onClick={() => navigate('/vendor/products/new')}>
                                Create Product
                            </PrimaryButton>
                        }
                    />
                </Card>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {products.map((p) => (
                        <Card key={p.id} className="p-5">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                <div className="w-14 h-14 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 flex-shrink-0 overflow-hidden">
                                    {p.images?.[0] ? (
                                        <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                        </svg>
                                    )}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h3 className="font-bold text-gray-900 dark:text-white truncate">{p.name}</h3>
                                        <StatusBadge status={p.status} />
                                        {p.sku && <span className="text-xs text-gray-400 font-mono">{p.sku}</span>}
                                    </div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                                        {p.category} • {formatCurrency(p.price)} / {p.unit} • MOQ {formatNumber(p.moq)}
                                        {p.stock !== null && ` • ${formatNumber(p.stock)} in stock`}
                                    </p>
                                </div>

                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <SecondaryButton onClick={() => togglePublish(p)} className="!px-3 !py-2 text-xs">
                                        {p.status === 'published' ? 'Unpublish' : 'Publish'}
                                    </SecondaryButton>
                                    <SecondaryButton onClick={() => navigate(`/vendor/products/${p.id}/edit`)} className="!px-3 !py-2 text-xs">
                                        Edit
                                    </SecondaryButton>
                                    <button
                                        onClick={() => handleDelete(p)}
                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                                        title="Delete"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

export default VendorProducts;
