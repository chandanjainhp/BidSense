import React, { useMemo, useState } from 'react';
import { productApi, bulkSaleApi } from '../api/vendorApi';
import { useFetch } from '../hooks/useVendor';
import { useToast } from '../../../context/ToastContext';
import { PageHeader, Card, EmptyState, LoadingState, Field, inputClasses, PrimaryButton, SecondaryButton } from '../components/common';
import { validateTiers, tierLabel, formatCurrency, StatusBadge } from '../utils/format.jsx';

const emptyTier = () => ({ min_quantity: '', max_quantity: '', unit_price: '' });

const BulkSales = () => {
    const { success, error: showError } = useToast();
    const { data: productsData, loading: productsLoading } = useFetch(() => productApi.list({ page_size: 200, status: 'published' }), []);
    const { data: salesData, loading: salesLoading, reload } = useFetch(() => bulkSaleApi.list(), []);

    const products = productsData?.items || [];
    const sales = salesData?.items || [];

    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [productId, setProductId] = useState('');
    const [minOrder, setMinOrder] = useState(1);
    const [discount, setDiscount] = useState(0);
    const [isActive, setIsActive] = useState(true);
    const [startsAt, setStartsAt] = useState('');
    const [endsAt, setEndsAt] = useState('');
    const [tiers, setTiers] = useState([emptyTier()]);
    const [saving, setSaving] = useState(false);
    const [tierErrors, setTierErrors] = useState([]);

    // Products already having a bulk sale (cannot create another)
    const productsWithSales = useMemo(() => new Set(sales.map(s => s.product_id)), [sales]);
    const availableProducts = products.filter(p => !productsWithSales.has(p.id));

    const resetForm = () => {
        setEditingId(null);
        setProductId('');
        setMinOrder(1);
        setDiscount(0);
        setIsActive(true);
        setStartsAt('');
        setEndsAt('');
        setTiers([emptyTier()]);
        setTierErrors([]);
    };

    const openCreate = () => {
        resetForm();
        setShowForm(true);
    };

    const openEdit = (sale) => {
        setEditingId(sale.id);
        setProductId(sale.product_id);
        setMinOrder(sale.min_order_quantity);
        setDiscount(Number(sale.bulk_discount_percent) || 0);
        setIsActive(sale.is_active);
        setStartsAt(sale.starts_at ? sale.starts_at.slice(0, 16) : '');
        setEndsAt(sale.ends_at ? sale.ends_at.slice(0, 16) : '');
        setTiers(sale.tiers.map(t => ({
            min_quantity: t.min_quantity,
            max_quantity: t.max_quantity ?? '',
            unit_price: Number(t.unit_price),
        })));
        setTierErrors([]);
        setShowForm(true);
    };

    const setTier = (idx, field, value) => {
        setTiers(t => t.map((tier, i) => i === idx ? { ...tier, [field]: value } : tier));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const errs = validateTiers(tiers);
        setTierErrors(errs);
        if (errs.length || !productId) {
            if (!productId) showError('Select a product for this bulk sale');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                product_id: productId,
                min_order_quantity: Number(minOrder) || 1,
                bulk_discount_percent: Number(discount) || 0,
                is_active: isActive,
                starts_at: startsAt ? new Date(startsAt).toISOString() : null,
                ends_at: endsAt ? new Date(endsAt).toISOString() : null,
                tiers: tiers
                    .filter(t => t.min_quantity !== '' && t.unit_price !== '')
                    .map(t => ({
                        min_quantity: Number(t.min_quantity),
                        max_quantity: t.max_quantity === '' || t.max_quantity === null ? null : Number(t.max_quantity),
                        unit_price: Number(t.unit_price),
                    })),
            };
            if (editingId) {
                const { product_id, ...updatePayload } = payload;
                await bulkSaleApi.update(editingId, updatePayload);
                success('Bulk sale updated');
            } else {
                await bulkSaleApi.create(payload);
                success('Bulk sale created');
            }
            setShowForm(false);
            resetForm();
            reload();
        } catch (err) {
            const detail = err?.response?.data?.detail;
            showError(typeof detail === 'string' ? detail : 'Save failed — check tier ranges');
        } finally {
            setSaving(false);
        }
    };

    const toggleActive = async (sale) => {
        try {
            await bulkSaleApi.update(sale.id, { is_active: !sale.is_active });
            reload();
        } catch (err) {
            showError(err?.response?.data?.detail || 'Update failed');
        }
    };

    const handleDelete = async (sale) => {
        if (!window.confirm('Delete this bulk sale and its pricing tiers?')) return;
        try {
            await bulkSaleApi.remove(sale.id);
            success('Bulk sale deleted');
            reload();
        } catch (err) {
            showError(err?.response?.data?.detail || 'Delete failed');
        }
    };

    const productName = (pid) => products.find(p => p.id === pid)?.name || 'Unknown product';

    if (productsLoading || salesLoading) return <div className="p-6 lg:p-10"><LoadingState /></div>;

    return (
        <div className="p-6 lg:p-10 max-w-4xl mx-auto">
            <PageHeader
                title="Bulk Sales"
                subtitle="Configure tiered volume pricing on your published products"
                actions={
                    !showForm && availableProducts.length > 0 && (
                        <PrimaryButton onClick={openCreate}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                            New Bulk Sale
                        </PrimaryButton>
                    )
                }
            />

            {/* Create/Edit form */}
            {showForm && (
                <Card className="p-6 mb-8">
                    <h3 className="font-bold text-gray-900 dark:text-white mb-5">
                        {editingId ? 'Edit Bulk Sale' : 'New Bulk Sale'}
                    </h3>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field label="Product *">
                                <select className={inputClasses(false)} value={productId} onChange={e => setProductId(e.target.value)} disabled={!!editingId}>
                                    <option value="">Select a published product</option>
                                    {(editingId ? products : availableProducts).map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </Field>
                            <div className="grid grid-cols-2 gap-4">
                                <Field label="Min Order Qty">
                                    <input type="number" min="1" className={inputClasses(false)} value={minOrder} onChange={e => setMinOrder(e.target.value)} />
                                </Field>
                                <Field label="Bulk Discount %">
                                    <input type="number" min="0" max="100" className={inputClasses(false)} value={discount} onChange={e => setDiscount(e.target.value)} />
                                </Field>
                            </div>
                            <Field label="Sale Starts (optional)">
                                <input type="datetime-local" className={inputClasses(false)} value={startsAt} onChange={e => setStartsAt(e.target.value)} />
                            </Field>
                            <Field label="Sale Ends (optional)">
                                <input type="datetime-local" className={inputClasses(false)} value={endsAt} onChange={e => setEndsAt(e.target.value)} />
                            </Field>
                        </div>

                        {/* Tier editor */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Pricing Tiers *</label>
                                <SecondaryButton type="button" onClick={() => setTiers(t => [...t, emptyTier()])} className="!px-3 !py-1.5 text-xs">
                                    + Add Tier
                                </SecondaryButton>
                            </div>

                            <div className="space-y-2">
                                {tiers.map((tier, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                        <span className="text-xs text-gray-400 w-10">T{idx + 1}</span>
                                        <input
                                            type="number" min="1" placeholder="Min"
                                            className={`${inputClasses(false)} !w-24`}
                                            value={tier.min_quantity}
                                            onChange={e => setTier(idx, 'min_quantity', e.target.value)}
                                        />
                                        <span className="text-gray-400 text-sm">–</span>
                                        <input
                                            type="number" min="1" placeholder="∞"
                                            className={`${inputClasses(false)} !w-24`}
                                            value={tier.max_quantity}
                                            onChange={e => setTier(idx, 'max_quantity', e.target.value)}
                                            title="Leave empty for open-ended (e.g. 500+)"
                                        />
                                        <span className="text-gray-400 text-sm">₹</span>
                                        <input
                                            type="number" min="0" step="0.01" placeholder="Price"
                                            className={`${inputClasses(false)} !w-28`}
                                            value={tier.unit_price}
                                            onChange={e => setTier(idx, 'unit_price', e.target.value)}
                                        />
                                        {tiers.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => setTiers(t => t.filter((_, i) => i !== idx))}
                                                className="p-2 text-gray-400 hover:text-red-500 rounded-lg"
                                                title="Remove tier"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {tierErrors.length > 0 && (
                                <div className="mt-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 p-3">
                                    {tierErrors.map((err, i) => (
                                        <p key={i} className="text-xs text-red-600 dark:text-red-400">• {err}</p>
                                    ))}
                                </div>
                            )}
                            <p className="text-xs text-gray-400 mt-2">Leave max empty for an open-ended tier like "500+". Ranges must not overlap.</p>
                        </div>

                        <label className="flex items-center gap-2.5">
                            <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="h-4 w-4 rounded text-indigo-600" />
                            <span className="text-sm text-gray-700 dark:text-gray-300">Active (visible to buyers)</span>
                        </label>

                        <div className="flex gap-3 justify-end">
                            <SecondaryButton type="button" onClick={() => { setShowForm(false); resetForm(); }}>Cancel</SecondaryButton>
                            <PrimaryButton type="submit" disabled={saving}>
                                {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Create Bulk Sale'}
                            </PrimaryButton>
                        </div>
                    </form>
                </Card>
            )}

            {/* Sales list */}
            {sales.length === 0 && !showForm ? (
                <Card>
                    <EmptyState
                        icon="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                        title="No bulk sales yet"
                        subtitle={availableProducts.length === 0
                            ? 'Publish a product first, then configure tiered bulk pricing on it.'
                            : 'Offer volume discounts with tiered pricing (e.g. 1-49 @ ₹500, 50-199 @ ₹450…).'}
                        action={availableProducts.length > 0 && <PrimaryButton onClick={openCreate}>Create Bulk Sale</PrimaryButton>}
                    />
                </Card>
            ) : (
                <div className="space-y-4">
                    {sales.map((sale) => (
                        <Card key={sale.id} className="p-5">
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 flex-wrap mb-3">
                                        <h3 className="font-bold text-gray-900 dark:text-white">{productName(sale.product_id)}</h3>
                                        <StatusBadge status={sale.is_active ? 'published' : 'draft'} />
                                    </div>

                                    {/* Tier table */}
                                    <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="bg-gray-50 dark:bg-gray-800/60 text-left">
                                                    <th className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-gray-400">Quantity Range</th>
                                                    <th className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-gray-400 text-right">Unit Price</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {sale.tiers.map((t, i) => (
                                                    <tr key={i} className="border-t border-gray-100 dark:border-gray-800">
                                                        <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{tierLabel(t)}</td>
                                                        <td className="px-3 py-2 text-right font-bold text-gray-900 dark:text-white">{formatCurrency(t.unit_price)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    <p className="text-xs text-gray-400 mt-2">
                                        Min order {sale.min_order_quantity}
                                        {Number(sale.bulk_discount_percent) > 0 && ` • ${sale.bulk_discount_percent}% bulk discount`}
                                        {sale.ends_at && ` • Ends ${new Date(sale.ends_at).toLocaleDateString('en-IN')}`}
                                    </p>
                                </div>

                                <div className="flex sm:flex-col gap-2 flex-shrink-0">
                                    <SecondaryButton onClick={() => openEdit(sale)} className="!px-3 !py-1.5 text-xs">Edit</SecondaryButton>
                                    <SecondaryButton onClick={() => toggleActive(sale)} className="!px-3 !py-1.5 text-xs">
                                        {sale.is_active ? 'Deactivate' : 'Activate'}
                                    </SecondaryButton>
                                    <button onClick={() => handleDelete(sale)} className="p-2 text-gray-400 hover:text-red-500 rounded-lg self-center" title="Delete">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
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

export default BulkSales;
