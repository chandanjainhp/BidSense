import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { serviceApi } from '../api/vendorApi';
import { useToast } from '../../../context/ToastContext';
import { PageHeader, Card, Field, inputClasses, PrimaryButton, LoadingState } from '../components/common';

const PRICING_UNITS = ['hour', 'day', 'week', 'month', 'project', 'unit'];
const AVAILABILITY = [
    { value: 'available', label: 'Available' },
    { value: 'on_request', label: 'On Request' },
    { value: 'unavailable', label: 'Unavailable' },
];

const emptyForm = {
    name: '', description: '', category: '', base_price: '', pricing_unit: 'project',
    min_quantity: 1, service_area: '', availability: 'available',
    delivery_time: '', images: '', documents: '', terms: '', status: 'draft',
};

const ServiceForm = ({ mode }) => {
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
            serviceApi.get(id)
                .then(res => {
                    const s = res.data;
                    setForm({
                        name: s.name || '', description: s.description || '', category: s.category || '',
                        base_price: s.base_price ?? '', pricing_unit: s.pricing_unit || 'project',
                        min_quantity: s.min_quantity || 1,
                        service_area: (s.service_area || []).join(', '),
                        availability: s.availability || 'available',
                        delivery_time: s.delivery_time || '',
                        images: (s.images || []).join(', '),
                        documents: (s.documents || []).join(', '),
                        terms: s.terms || '', status: s.status || 'draft',
                    });
                })
                .catch(() => {
                    showError('Service not found');
                    navigate('/vendor/services');
                })
                .finally(() => setLoading(false));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));
    const toList = (v) => (v ? v.split(',').map(s => s.trim()).filter(Boolean) : []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const errs = {};
        if (!form.name || form.name.trim().length < 2) errs.name = 'Name is required';
        if (!form.category || form.category.trim().length < 2) errs.category = 'Category is required';
        if (form.base_price !== '' && Number(form.base_price) <= 0) errs.base_price = 'Price must be > 0';
        setErrors(errs);
        if (Object.keys(errs).length) return;

        setSaving(true);
        try {
            const payload = {
                name: form.name.trim(),
                description: form.description || null,
                category: form.category.trim(),
                base_price: form.base_price === '' ? null : Number(form.base_price),
                pricing_unit: form.pricing_unit,
                min_quantity: Number(form.min_quantity) || 1,
                service_area: toList(form.service_area),
                availability: form.availability,
                delivery_time: form.delivery_time || null,
                images: toList(form.images),
                documents: toList(form.documents),
                terms: form.terms || null,
                status: form.status,
            };
            if (isEdit) {
                await serviceApi.update(id, payload);
                success('Service updated');
            } else {
                await serviceApi.create(payload);
                success('Service created');
            }
            navigate('/vendor/services');
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
                title={isEdit ? 'Edit Service' : 'New Service'}
                subtitle={isEdit ? 'Update your service offering' : 'Offer a new service on the marketplace'}
            />

            <form onSubmit={handleSubmit} className="space-y-8">
                <Card className="p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                            <Field label="Service Name *" error={errors.name}>
                                <input className={inputClasses(errors.name)} value={form.name} onChange={set('name')} placeholder="Equipment Installation" />
                            </Field>
                        </div>
                        <Field label="Category *" error={errors.category}>
                            <input className={inputClasses(errors.category)} value={form.category} onChange={set('category')} placeholder="Installation" />
                        </Field>
                        <Field label="Availability">
                            <select className={inputClasses(false)} value={form.availability} onChange={set('availability')}>
                                {AVAILABILITY.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                            </select>
                        </Field>
                        <Field label="Base Price (₹)" error={errors.base_price}>
                            <input type="number" min="0" step="0.01" className={inputClasses(errors.base_price)} value={form.base_price} onChange={set('base_price')} placeholder="15000" />
                        </Field>
                        <Field label="Pricing Unit">
                            <select className={inputClasses(false)} value={form.pricing_unit} onChange={set('pricing_unit')}>
                                {PRICING_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                        </Field>
                        <Field label="Minimum Quantity">
                            <input type="number" min="1" className={inputClasses(false)} value={form.min_quantity} onChange={set('min_quantity')} />
                        </Field>
                        <Field label="Delivery / Implementation Time">
                            <input className={inputClasses(false)} value={form.delivery_time} onChange={set('delivery_time')} placeholder="1-2 weeks scheduling" />
                        </Field>
                        <div className="sm:col-span-2">
                            <Field label="Service Area" hint="Comma separated cities/regions">
                                <input className={inputClasses(false)} value={form.service_area} onChange={set('service_area')} placeholder="Mumbai, Pune" />
                            </Field>
                        </div>
                        <div className="sm:col-span-2">
                            <Field label="Description">
                                <textarea rows={4} className={inputClasses(false)} value={form.description} onChange={set('description')} />
                            </Field>
                        </div>
                        <div className="sm:col-span-2">
                            <Field label="Terms & Conditions">
                                <textarea rows={3} className={inputClasses(false)} value={form.terms} onChange={set('terms')} />
                            </Field>
                        </div>
                        <Field label="Image URLs" hint="Comma separated">
                            <input className={inputClasses(false)} value={form.images} onChange={set('images')} />
                        </Field>
                        <Field label="Document URLs" hint="Brochures, certificates…">
                            <input className={inputClasses(false)} value={form.documents} onChange={set('documents')} />
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
                    <button type="button" onClick={() => navigate('/vendor/services')} className="px-6 py-2.5 rounded-xl text-sm font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-white">
                        Cancel
                    </button>
                    <PrimaryButton type="submit" disabled={saving}>
                        {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Service'}
                    </PrimaryButton>
                </div>
            </form>
        </div>
    );
};

export default ServiceForm;
