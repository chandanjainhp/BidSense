import React, { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { vendorApi, inquiryApi } from '../api/vendorApi';
import { useFetch } from '../hooks/useVendor';
import { useToast } from '../../../context/ToastContext';
import { Card, EmptyState, LoadingState, Field, inputClasses, PrimaryButton, SecondaryButton } from '../components/common';
import { formatCurrency, formatNumber, tierLabel } from '../utils/format.jsx';

const InquiryModal = ({ vendor, product, service, bulkSale, onClose }) => {
    const { success, error: showError } = useToast();
    const [quantity, setQuantity] = useState(bulkSale?.min_order_quantity || 1);
    const [targetPrice, setTargetPrice] = useState('');
    const [location, setLocation] = useState('');
    const [requiredDate, setRequiredDate] = useState('');
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);

    // Suggest the tier price for the entered quantity
    const suggestedPrice = useMemo(() => {
        if (!bulkSale) return null;
        const qty = Number(quantity) || 0;
        const tier = bulkSale.tiers.find(t =>
            qty >= t.min_quantity && (t.max_quantity === null || qty <= t.max_quantity)
        );
        return tier ? Number(tier.unit_price) : null;
    }, [bulkSale, quantity]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!location || location.trim().length < 2) {
            showError('Delivery location is required');
            return;
        }
        setSending(true);
        try {
            await inquiryApi.create({
                vendor_id: vendor.id,
                product_id: product?.id || null,
                service_id: service?.id || null,
                quantity: Number(quantity) || 1,
                target_price: targetPrice ? Number(targetPrice) : null,
                delivery_location: location.trim(),
                required_date: requiredDate || null,
                message: message || null,
            });
            success('Inquiry sent! The vendor will respond with a quotation.');
            onClose();
        } catch (err) {
            const detail = err?.response?.data?.detail;
            if (detail === 'Not authenticated' || err?.response?.status === 401) {
                showError('Please log in to send an inquiry.');
            } else {
                showError(typeof detail === 'string' ? detail : 'Failed to send inquiry');
            }
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="p-6">
                    <div className="flex items-start justify-between mb-5">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Send Inquiry</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                To {vendor.business_name} — {product?.name || service?.name}
                            </p>
                        </div>
                        <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-900 dark:hover:text-white">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>

                    {bulkSale && (
                        <div className="mb-4 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 p-3">
                            <p className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-2">Bulk pricing</p>
                            <div className="space-y-1 text-sm">
                                {bulkSale.tiers.map((t, i) => (
                                    <div key={i} className="flex justify-between text-gray-600 dark:text-gray-300">
                                        <span>{tierLabel(t)}</span>
                                        <span className="font-bold">{formatCurrency(t.unit_price)}</span>
                                    </div>
                                ))}
                            </div>
                            {suggestedPrice && (
                                <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-2">
                                    Your quantity of {formatNumber(quantity)} → {formatCurrency(suggestedPrice)}/unit
                                </p>
                            )}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Quantity *">
                                <input type="number" min="1" className={inputClasses(false)} value={quantity} onChange={e => setQuantity(e.target.value)} />
                            </Field>
                            <Field label="Target Price (₹)">
                                <input type="number" min="0" step="0.01" className={inputClasses(false)} value={targetPrice} onChange={e => setTargetPrice(e.target.value)} placeholder={suggestedPrice ? String(suggestedPrice) : 'Optional'} />
                            </Field>
                        </div>
                        <Field label="Delivery Location *">
                            <input className={inputClasses(false)} value={location} onChange={e => setLocation(e.target.value)} placeholder="City, area / warehouse" />
                        </Field>
                        <Field label="Required Delivery Date">
                            <input type="date" className={inputClasses(false)} value={requiredDate} onChange={e => setRequiredDate(e.target.value)} min={new Date().toISOString().split('T')[0]} />
                        </Field>
                        <Field label="Message">
                            <textarea rows={3} className={inputClasses(false)} value={message} onChange={e => setMessage(e.target.value)} placeholder="Specifications, packaging, delivery notes…" />
                        </Field>

                        <div className="flex gap-3 justify-end">
                            <SecondaryButton type="button" onClick={onClose}>Cancel</SecondaryButton>
                            <PrimaryButton type="submit" disabled={sending}>
                                {sending ? 'Sending…' : 'Send Inquiry'}
                            </PrimaryButton>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

const VendorStorePage = () => {
    const { vendorId } = useParams();
    const { data: vendor, loading: vendorLoading, error } = useFetch(() => vendorApi.getPublicStore(vendorId), [vendorId]);
    const { data: productsData, loading: productsLoading } = useFetch(() => vendorApi.getPublicStoreProducts(vendorId), [vendorId]);
    const { data: servicesData, loading: servicesLoading } = useFetch(() => vendorApi.getPublicStoreServices(vendorId), [vendorId]);
    const { data: salesData } = useFetch(() => vendorApi.getPublicStoreBulkSales(vendorId), [vendorId]);
    const [inquiryTarget, setInquiryTarget] = useState(null); // {product?, service?, bulkSale?}

    const products = productsData?.items || [];
    const services = servicesData?.items || [];
    const sales = salesData?.items || [];

    const bulkSaleByProduct = useMemo(
        () => Object.fromEntries(sales.filter(s => s.is_active).map(s => [s.product_id, s])),
        [sales]
    );

    if (vendorLoading) {
        return <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center"><LoadingState /></div>;
    }

    if (error || !vendor) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center p-6">
                <Card className="p-10 text-center max-w-md">
                    <EmptyState
                        icon="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3"
                        title="Store not found"
                        subtitle="This vendor doesn't exist or isn't publicly visible yet."
                        action={<Link to="/marketplace" className="text-sm font-bold text-indigo-600 hover:text-indigo-700">← Back to Marketplace</Link>}
                    />
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-black">
            {/* Banner */}
            <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 dark:from-gray-900 dark:via-gray-900 dark:to-black">
                <div className="max-w-6xl mx-auto px-6 py-14">
                    <Link to="/marketplace" className="text-indigo-200 hover:text-white text-sm font-semibold inline-flex items-center gap-1 mb-8">
                        ← Marketplace
                    </Link>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                        {vendor.logo_url ? (
                            <img src={vendor.logo_url} alt={vendor.business_name} className="w-20 h-20 rounded-2xl object-cover ring-4 ring-white/20" />
                        ) : (
                            <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center text-3xl font-bold text-white ring-4 ring-white/20">
                                {vendor.business_name?.charAt(0)}
                            </div>
                        )}
                        <div className="flex-1">
                            <div className="flex items-center gap-3 flex-wrap">
                                <h1 className="text-3xl font-bold text-white">{vendor.business_name}</h1>
                                {vendor.status === 'verified' && (
                                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-300 bg-emerald-500/20 px-2.5 py-1 rounded-full">
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Verified Vendor
                                    </span>
                                )}
                            </div>
                            <p className="text-indigo-100 dark:text-gray-400 mt-1">
                                {vendor.business_category}{vendor.city ? ` • ${vendor.city}` : ''}{vendor.state ? `, ${vendor.state}` : ''}
                            </p>
                            {vendor.description && (
                                <p className="text-indigo-100/90 dark:text-gray-300 mt-3 max-w-2xl text-sm">{vendor.description}</p>
                            )}
                        </div>
                        <button
                            onClick={() => setInquiryTarget({})}
                            className="px-5 py-3 rounded-xl bg-white text-gray-900 text-sm font-bold shadow-lg hover:bg-indigo-50 transition-colors"
                        >
                            Contact Vendor
                        </button>
                    </div>

                    {(vendor.service_areas?.length > 0 || vendor.certifications?.length > 0) && (
                        <div className="flex flex-wrap gap-2 mt-6">
                            {vendor.service_areas?.map((a, i) => (
                                <span key={`a-${i}`} className="text-xs font-semibold bg-white/10 text-white px-2.5 py-1 rounded-full">📍 {a}</span>
                            ))}
                            {vendor.certifications?.map((c, i) => (
                                <span key={`c-${i}`} className="text-xs font-semibold bg-amber-400/20 text-amber-100 px-2.5 py-1 rounded-full">🎖 {c}</span>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-6 py-12 space-y-12">
                {/* Bulk sale offers */}
                {Object.keys(bulkSaleByProduct).length > 0 && (
                    <section>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-5">🔥 Bulk Sale Offers</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {Object.values(bulkSaleByProduct).map((sale) => {
                                const product = products.find(p => p.id === sale.product_id);
                                return (
                                    <Card key={sale.id} className="p-5 border-2 border-indigo-100 dark:border-indigo-500/20">
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="font-bold text-gray-900 dark:text-white">{product?.name || 'Product'}</h3>
                                            <span className="text-xs font-bold bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2.5 py-1 rounded-full">BULK OFFER</span>
                                        </div>
                                        <div className="space-y-1.5">
                                            {sale.tiers.map((t, i) => (
                                                <div key={i} className="flex justify-between text-sm">
                                                    <span className="text-gray-500 dark:text-gray-400">{tierLabel(t)}</span>
                                                    <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(t.unit_price)}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <PrimaryButton
                                            className="w-full mt-4"
                                            onClick={() => setInquiryTarget({ product, bulkSale: sale })}
                                        >
                                            Request Bulk Quote
                                        </PrimaryButton>
                                    </Card>
                                );
                            })}
                        </div>
                    </section>
                )}

                {/* Products */}
                <section>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-5">Products</h2>
                    {productsLoading ? (
                        <LoadingState />
                    ) : products.length === 0 ? (
                        <Card><EmptyState title="No products listed" /></Card>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                            {products.map((p) => (
                                <Card key={p.id} className="p-5 flex flex-col">
                                    <div className="h-36 rounded-xl bg-gray-100 dark:bg-gray-800 mb-4 flex items-center justify-center overflow-hidden">
                                        {p.images?.[0] ? (
                                            <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                            </svg>
                                        )}
                                    </div>
                                    <h3 className="font-bold text-gray-900 dark:text-white">{p.name}</h3>
                                    <p className="text-xs text-gray-400 mt-0.5">{p.category}{p.sku ? ` • ${p.sku}` : ''}</p>
                                    {p.description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 line-clamp-2 flex-1">{p.description}</p>}
                                    <div className="flex items-center justify-between mt-4">
                                        <div>
                                            <p className="text-lg font-bold text-gray-900 dark:text-white">{p.price ? formatCurrency(p.price) : 'On request'}</p>
                                            <p className="text-[11px] text-gray-400">per {p.unit} • MOQ {formatNumber(p.moq)}</p>
                                        </div>
                                        <SecondaryButton onClick={() => setInquiryTarget({ product })} className="!px-4 !py-2 text-xs">
                                            Inquire
                                        </SecondaryButton>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </section>

                {/* Services */}
                <section>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-5">Services</h2>
                    {servicesLoading ? (
                        <LoadingState />
                    ) : services.length === 0 ? (
                        <Card><EmptyState title="No services listed" /></Card>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            {services.map((s) => (
                                <Card key={s.id} className="p-5 flex flex-col">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-bold text-gray-900 dark:text-white">{s.name}</h3>
                                        {s.availability === 'available' && (
                                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">● Available</span>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-400 mt-0.5">{s.category}</p>
                                    {s.description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 line-clamp-2 flex-1">{s.description}</p>}
                                    <div className="flex items-center justify-between mt-4">
                                        <div>
                                            <p className="text-lg font-bold text-gray-900 dark:text-white">{s.base_price ? formatCurrency(s.base_price) : 'On request'}</p>
                                            <p className="text-[11px] text-gray-400">per {s.pricing_unit}{s.delivery_time ? ` • ${s.delivery_time}` : ''}</p>
                                        </div>
                                        <SecondaryButton onClick={() => setInquiryTarget({ service: s })} className="!px-4 !py-2 text-xs">
                                            Inquire
                                        </SecondaryButton>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </section>
            </div>

            {inquiryTarget && (
                <InquiryModal
                    vendor={vendor}
                    product={inquiryTarget.product}
                    service={inquiryTarget.service}
                    bulkSale={inquiryTarget.bulkSale || (inquiryTarget.product ? bulkSaleByProduct[inquiryTarget.product.id] : null)}
                    onClose={() => setInquiryTarget(null)}
                />
            )}
        </div>
    );
};

export default VendorStorePage;
