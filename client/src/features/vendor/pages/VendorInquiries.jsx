import React, { useState } from 'react';
import { inquiryApi, quotationApi, productApi, serviceApi } from '../api/vendorApi';
import { useFetch } from '../hooks/useVendor';
import { useToast } from '../../../context/ToastContext';
import { PageHeader, Card, EmptyState, LoadingState, Field, inputClasses, PrimaryButton, SecondaryButton } from '../components/common';
import { StatusBadge, formatCurrency, formatDateTime, formatNumber } from '../utils/format.jsx';

const QuotationModal = ({ inquiry, productMap, serviceMap, onClose, onCreated }) => {
    const { success, error: showError } = useToast();
    const [unitPrice, setUnitPrice] = useState('');
    const [discount, setDiscount] = useState(0);
    const [tax, setTax] = useState(18);
    const [shipping, setShipping] = useState(0);
    const [validDays, setValidDays] = useState(7);
    const [deliveryTime, setDeliveryTime] = useState('');
    const [terms, setTerms] = useState('');
    const [saving, setSaving] = useState(false);

    const itemName = inquiry.product_id
        ? productMap[inquiry.product_id]?.name || 'Product'
        : serviceMap[inquiry.service_id]?.name || 'Service';

    const qty = inquiry.quantity || 1;
    const subtotal = (Number(unitPrice) || 0) * qty;
    const discountAmt = subtotal * (Number(discount) || 0) / 100;
    const taxAmt = (subtotal - discountAmt) * (Number(tax) || 0) / 100;
    const total = subtotal - discountAmt + taxAmt + (Number(shipping) || 0);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!unitPrice || Number(unitPrice) <= 0) {
            showError('Enter a valid unit price');
            return;
        }
        setSaving(true);
        try {
            await quotationApi.createForInquiry(inquiry.id, {
                bulk_discount_percent: Number(discount) || 0,
                tax_percent: Number(tax) || 0,
                shipping_fee: Number(shipping) || 0,
                valid_until: new Date(Date.now() + (Number(validDays) || 7) * 86400000).toISOString(),
                delivery_time: deliveryTime || null,
                terms: terms || null,
                items: [{
                    product_id: inquiry.product_id || null,
                    service_id: inquiry.service_id || null,
                    name: itemName,
                    quantity: qty,
                    unit_price: Number(unitPrice),
                }],
            });
            success('Quotation sent to buyer');
            onCreated();
        } catch (err) {
            showError(err?.response?.data?.detail || 'Failed to create quotation');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="p-6">
                    <div className="flex items-start justify-between mb-5">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Create Quotation</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {itemName} • {formatNumber(qty)} units • Target {inquiry.target_price ? formatCurrency(inquiry.target_price) : '—'}
                            </p>
                        </div>
                        <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-900 dark:hover:text-white">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Unit Price (₹) *">
                                <input type="number" min="0" step="0.01" className={inputClasses(false)} value={unitPrice} onChange={e => setUnitPrice(e.target.value)} placeholder="420" autoFocus />
                            </Field>
                            <Field label="Bulk Discount %">
                                <input type="number" min="0" max="100" className={inputClasses(false)} value={discount} onChange={e => setDiscount(e.target.value)} />
                            </Field>
                            <Field label="Tax % (GST)">
                                <input type="number" min="0" max="100" className={inputClasses(false)} value={tax} onChange={e => setTax(e.target.value)} />
                            </Field>
                            <Field label="Shipping (₹)">
                                <input type="number" min="0" className={inputClasses(false)} value={shipping} onChange={e => setShipping(e.target.value)} />
                            </Field>
                            <Field label="Valid For (days)">
                                <input type="number" min="1" className={inputClasses(false)} value={validDays} onChange={e => setValidDays(e.target.value)} />
                            </Field>
                            <Field label="Delivery Time">
                                <input className={inputClasses(false)} value={deliveryTime} onChange={e => setDeliveryTime(e.target.value)} placeholder="5-7 days" />
                            </Field>
                        </div>

                        <Field label="Terms">
                            <textarea rows={2} className={inputClasses(false)} value={terms} onChange={e => setTerms(e.target.value)} placeholder="50% advance, balance on delivery" />
                        </Field>

                        {/* Totals preview */}
                        <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 p-4 space-y-1.5 text-sm">
                            <div className="flex justify-between text-gray-500 dark:text-gray-400">
                                <span>Subtotal ({formatNumber(qty)} × {formatCurrency(unitPrice || 0)})</span>
                                <span>{formatCurrency(subtotal)}</span>
                            </div>
                            {Number(discount) > 0 && (
                                <div className="flex justify-between text-emerald-600">
                                    <span>Bulk discount ({discount}%)</span>
                                    <span>−{formatCurrency(discountAmt)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-gray-500 dark:text-gray-400">
                                <span>Tax ({tax}%)</span>
                                <span>{formatCurrency(taxAmt)}</span>
                            </div>
                            <div className="flex justify-between text-gray-500 dark:text-gray-400">
                                <span>Shipping</span>
                                <span>{formatCurrency(Number(shipping) || 0)}</span>
                            </div>
                            <div className="flex justify-between font-bold text-gray-900 dark:text-white pt-1.5 border-t border-gray-200 dark:border-gray-700">
                                <span>Total</span>
                                <span>{formatCurrency(total)}</span>
                            </div>
                        </div>

                        <div className="flex gap-3 justify-end">
                            <SecondaryButton type="button" onClick={onClose}>Cancel</SecondaryButton>
                            <PrimaryButton type="submit" disabled={saving}>
                                {saving ? 'Sending…' : 'Send Quotation'}
                            </PrimaryButton>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

const VendorInquiries = () => {
    const { data, loading, reload } = useFetch(() => inquiryApi.listMine({ page_size: 100 }), []);
    const { data: productsData } = useFetch(() => productApi.list({ page_size: 200 }), []);
    const { data: servicesData } = useFetch(() => serviceApi.list({ page_size: 200 }), []);
    const [filter, setFilter] = useState('all');
    const [quotingInquiry, setQuotingInquiry] = useState(null);

    const inquiries = data?.items || [];
    const filtered = filter === 'all' ? inquiries : inquiries.filter(i => i.status === filter);

    const productMap = Object.fromEntries((productsData?.items || []).map(p => [p.id, p]));
    const serviceMap = Object.fromEntries((servicesData?.items || []).map(s => [s.id, s]));

    const itemName = (i) =>
        i.product_id ? (productMap[i.product_id]?.name || 'Product') : (serviceMap[i.service_id]?.name || 'Service');

    return (
        <div className="p-6 lg:p-10">
            <PageHeader title="Inquiries" subtitle="Buyer requests for your products and services" />

            {/* Status filter tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
                {['all', 'pending', 'viewed', 'quoted', 'accepted', 'rejected', 'cancelled'].map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${filter === f
                            ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                            : 'bg-white dark:bg-gray-900/50 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-800 hover:border-gray-300'
                            }`}
                    >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                        {f !== 'all' && (
                            <span className="ml-1.5 text-xs opacity-60">{inquiries.filter(i => i.status === f).length}</span>
                        )}
                    </button>
                ))}
            </div>

            {loading ? (
                <LoadingState />
            ) : filtered.length === 0 ? (
                <Card>
                    <EmptyState
                        icon="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                        title={filter === 'all' ? 'No inquiries yet' : `No ${filter} inquiries`}
                        subtitle="Buyers can inquire directly from your public store page."
                    />
                </Card>
            ) : (
                <div className="space-y-4">
                    {filtered.map((inquiry) => (
                        <Card key={inquiry.id} className="p-5">
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                                        <h3 className="font-bold text-gray-900 dark:text-white">{itemName(inquiry)}</h3>
                                        <StatusBadge status={inquiry.status} />
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
                                        <span>Qty: <b className="text-gray-900 dark:text-white">{formatNumber(inquiry.quantity)}</b></span>
                                        <span>Target: <b className="text-gray-900 dark:text-white">{inquiry.target_price ? formatCurrency(inquiry.target_price) : '—'}</b></span>
                                        <span className="col-span-2 truncate">📍 {inquiry.delivery_location}</span>
                                    </div>
                                    {inquiry.message && (
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 italic">"{inquiry.message}"</p>
                                    )}
                                    <p className="text-xs text-gray-400 mt-1.5">{formatDateTime(inquiry.created_at)}</p>
                                </div>

                                <div className="flex items-center gap-2 flex-shrink-0">
                                    {['pending', 'viewed'].includes(inquiry.status) && (
                                        <PrimaryButton onClick={() => setQuotingInquiry(inquiry)}>
                                            Send Quotation
                                        </PrimaryButton>
                                    )}
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {quotingInquiry && (
                <QuotationModal
                    inquiry={quotingInquiry}
                    productMap={productMap}
                    serviceMap={serviceMap}
                    onClose={() => setQuotingInquiry(null)}
                    onCreated={() => {
                        setQuotingInquiry(null);
                        reload();
                    }}
                />
            )}
        </div>
    );
};

export default VendorInquiries;
