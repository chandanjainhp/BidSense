import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { productApi } from '../api/vendorApi';
import { useToast } from '../../../context/ToastContext';
import { PageHeader, Card, Field, inputClasses, PrimaryButton, LoadingState } from '../components/common';

const UNITS = ['unit', 'piece', 'box', 'kg', 'litre', 'metre', 'set', 'pack'];

const emptyForm = {
    name: '', sku: '', description: '', category: '', price: '', stock: '',
    unit: 'unit', moq: 1, status: 'draft', images: '',
};

const ProductForm = ({ mode }) => {
    const isEdit = mode === 'edit';
    const { id } = useParams();
    const navigate = useNavigate();
    const { success, error: showError } = useToast();
    const [form, setForm] = useState(emptyForm);
    const [loading, setLoading] = useState(isEdit);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (isEdit) {
            productApi.get(id)
                .then(res => {
                    const p = res.data;
                    setForm({
                        name: p.name || '', sku: p.sku || '', description: p.description || '',
                        category: p.category || '', price: p.price ?? '', stock: p.stock ?? '',
                        unit: p.unit || 'unit', moq: p.moq || 1, status: p.status || 'draft',
                        images: (p.images || []).join(', '),
                    });
                })
                .catch(() => {
                    showError('Product not found');
                    navigate('/vendor/products');
                })
                .finally(() => setLoading(false));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        const errs = {};
        if (!form.name || form.name.trim().length < 2) errs.name = 'Name is required';
        if (!form.category || form.category.trim().length < 2) errs.category = 'Category is required';
        if (form.price !== '' && Number(form.price) <= 0) errs.price = 'Price must be > 0';
        if (Number(form.moq) < 1) errs.moq = 'MOQ must be at least 1';
        setErrors(errs);
        if (Object.keys(errs).length) return;

        setSaving(true);
        try {
            const payload = {
                name: form.name.trim(),
                sku: form.sku || null,
                description: form.description || null,
                category: form.category.trim(),
                price: form.price === '' ? null : Number(form.price),
                stock: form.stock === '' ? null : Number(form.stock),
                unit: form.unit,
                moq: Number(form.moq),
                status: form.status,
                images: form.images ? form.images.split(',').map(s => s.trim()).filter(Boolean) : [],
            };
            if (isEdit) {
                await productApi.update(id, payload);
                success('Product updated');
            } else {
                await productApi.create(payload);
                success('Product created');
            }
            navigate('/vendor/products');
        } catch (err) {
            showError(err?.response?.data?.detail || 'Save failed');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-6 lg:p-10"><LoadingState /></div>;

    return (
        <div className="p-6 lg:p-10 max-w-3xl mx-auto">
            <PageHeader
                title={isEdit ? 'Edit Product' : 'New Product'}
                subtitle={isEdit ? 'Update your product details' : 'List a new product on the marketplace'}
            />

            <form onSubmit={handleSubmit} className="space-y-8">
                <Card className="p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                            <Field label="Product Name *" error={errors.name}>
                                <input className={inputClasses(errors.name)} value={form.name} onChange={set('name')} placeholder="Industrial Gloves" />
                            </Field>
                        </div>
                        <Field label="SKU">
                            <input className={inputClasses(false)} value={form.sku} onChange={set('sku')} placeholder="GLV-001" />
                        </Field>
                        <Field label="Category *" error={errors.category}>
                            <input className={inputClasses(errors.category)} value={form.category} onChange={set('category')} placeholder="Safety Equipment" />
                        </Field>
                        <Field label="Price (₹)" error={errors.price}>
                            <input type="number" min="0" step="0.01" className={inputClasses(errors.price)} value={form.price} onChange={set('price')} placeholder="500" />
                        </Field>
                        <Field label="Unit">
                            <select className={inputClasses(false)} value={form.unit} onChange={set('unit')}>
                                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                        </Field>
                        <Field label="Stock Quantity">
                            <input type="number" min="0" className={inputClasses(false)} value={form.stock} onChange={set('stock')} placeholder="1000" />
                        </Field>
                        <Field label="Minimum Order Qty (MOQ)" error={errors.moq}>
                            <input type="number" min="1" className={inputClasses(errors.moq)} value={form.moq} onChange={set('moq')} />
                        </Field>
                        <div className="sm:col-span-2">
                            <Field label="Description">
                                <textarea rows={4} className={inputClasses(false)} value={form.description} onChange={set('description')} placeholder="Describe the product, materials, use cases…" />
                            </Field>
                        </div>
                        <Field label="Image URLs" hint="Comma separated image URLs">
                            <input className={inputClasses(false)} value={form.images || ''} onChange={set('images')} placeholder="https://…, https://…" />
                        </Field>
                        <Field label="Status">
                            <select className={inputClasses(false)} value={form.status} onChange={set('status')}>
                                <option value="draft">Draft (private)</option>
                                <option value="published">Published (public)</option>
                                <option value="unpublished">Unpublished</option>
                            </select>
                        </Field>
                    </div>
                </Card>

                <div className="flex gap-3 justify-end">
                    <button type="button" onClick={() => navigate('/vendor/products')} className="px-6 py-2.5 rounded-xl text-sm font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-white">
                        Cancel
                    </button>
                    <PrimaryButton type="submit" disabled={saving}>
                        {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Product'}
                    </PrimaryButton>
                </div>
            </form>
        </div>
    );
};

export default ProductForm;
