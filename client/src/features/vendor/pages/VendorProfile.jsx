import React, { useEffect, useState } from 'react';
import { vendorApi } from '../api/vendorApi';
import { useToast } from '../../../context/ToastContext';
import { PageHeader, Card, Field, inputClasses, PrimaryButton, LoadingState } from '../components/common';
import { StatusBadge, isValidGstin, isValidPan, isValidPhone, isValidPincode } from '../utils/format.jsx';
import { useVendorProfile } from '../hooks/useVendor';

const STATUS_HELP = {
    pending: 'Your profile is awaiting admin verification. Your listings stay private until then.',
    verified: 'Your business is verified — your store is publicly visible on the marketplace.',
    rejected: 'Your verification was not approved. Update your details and resubmit documents.',
    suspended: 'Your account is suspended. Contact support for assistance.',
};

const VendorProfilePage = () => {
    const { refresh } = useVendorProfile();
    const { success, error: showError } = useToast();
    const [form, setForm] = useState(null);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        vendorApi.getMe()
            .then(res => setForm({
                ...res.data,
                service_areas: (res.data.service_areas || []).join(', '),
                certifications: (res.data.certifications || []).join(', '),
            }))
            .catch(() => showError('Failed to load profile'));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (!form) return <div className="p-6 lg:p-10"><LoadingState /></div>;

    const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

    const handleSave = async (e) => {
        e.preventDefault();
        const errs = {};
        if (form.gstin && !isValidGstin(form.gstin)) errs.gstin = 'Invalid GSTIN';
        if (form.pan && !isValidPan(form.pan)) errs.pan = 'Invalid PAN';
        if (form.contact_phone && !isValidPhone(form.contact_phone)) errs.contact_phone = 'Invalid phone';
        if (form.pincode && !isValidPincode(form.pincode)) errs.pincode = 'Invalid pincode';
        setErrors(errs);
        if (Object.keys(errs).length) return;

        setSaving(true);
        try {
            const payload = {
                business_name: form.business_name,
                contact_name: form.contact_name,
                phone: form.contact_phone,
                gstin: form.gstin || null,
                pan: form.pan || null,
                business_category: form.business_category,
                description: form.description || null,
                address_line: form.address_line || null,
                city: form.city || null,
                state: form.state || null,
                pincode: form.pincode || null,
                service_areas: form.service_areas.split(',').map(s => s.trim()).filter(Boolean),
                certifications: form.certifications.split(',').map(s => s.trim()).filter(Boolean),
                website: form.website || null,
                logo_url: form.logo_url || null,
            };
            await vendorApi.updateMe(payload);
            await refresh();
            success('Profile updated');
        } catch (err) {
            showError(err?.response?.data?.detail || 'Update failed');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="p-6 lg:p-10 max-w-4xl mx-auto">
            <PageHeader title="Business Profile" subtitle="Manage your public vendor information" />

            {/* Verification status */}
            <Card className="p-5 mb-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        {form.logo_url ? (
                            <img src={form.logo_url} alt="logo" className="w-14 h-14 rounded-xl object-cover" />
                        ) : (
                            <div className="w-14 h-14 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-xl font-bold text-indigo-600">
                                {form.business_name?.charAt(0)}
                            </div>
                        )}
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="font-bold text-gray-900 dark:text-white">{form.business_name}</h3>
                                <StatusBadge status={form.status} />
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">{form.business_category} • Joined {new Date(form.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</p>
                        </div>
                    </div>
                    <a
                        href={`/marketplace/${form.id}`}
                        className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1"
                    >
                        View public store
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                    </a>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 pl-1">{STATUS_HELP[form.status]}</p>
                {form.verification_note && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 pl-1 italic">Note: {form.verification_note}</p>
                )}
            </Card>

            <form onSubmit={handleSave} className="space-y-8">
                <Card className="p-6">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-600 mb-5">Business Information</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label="Company Name">
                            <input className={inputClasses(false)} value={form.business_name} onChange={set('business_name')} />
                        </Field>
                        <Field label="Business Category">
                            <input className={inputClasses(false)} value={form.business_category} onChange={set('business_category')} />
                        </Field>
                        <Field label="GSTIN" error={errors.gstin}>
                            <input className={inputClasses(errors.gstin)} value={form.gstin || ''} onChange={set('gstin')} maxLength={15} />
                        </Field>
                        <Field label="PAN" error={errors.pan}>
                            <input className={inputClasses(errors.pan)} value={form.pan || ''} onChange={set('pan')} maxLength={10} />
                        </Field>
                        <div className="sm:col-span-2">
                            <Field label="Description">
                                <textarea rows={3} className={inputClasses(false)} value={form.description || ''} onChange={set('description')} />
                            </Field>
                        </div>
                    </div>
                </Card>

                <Card className="p-6">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-600 mb-5">Contact Information</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label="Contact Person">
                            <input className={inputClasses(false)} value={form.contact_name} onChange={set('contact_name')} />
                        </Field>
                        <Field label="Phone" error={errors.contact_phone}>
                            <input className={inputClasses(errors.contact_phone)} value={form.contact_phone} onChange={set('contact_phone')} />
                        </Field>
                        <Field label="Website">
                            <input className={inputClasses(false)} value={form.website || ''} onChange={set('website')} />
                        </Field>
                        <Field label="Logo URL">
                            <input className={inputClasses(false)} value={form.logo_url || ''} onChange={set('logo_url')} placeholder="https://…" />
                        </Field>
                    </div>
                </Card>

                <Card className="p-6">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-600 mb-5">Address & Coverage</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                            <Field label="Address">
                                <input className={inputClasses(false)} value={form.address_line || ''} onChange={set('address_line')} />
                            </Field>
                        </div>
                        <Field label="City">
                            <input className={inputClasses(false)} value={form.city || ''} onChange={set('city')} />
                        </Field>
                        <Field label="State">
                            <input className={inputClasses(false)} value={form.state || ''} onChange={set('state')} />
                        </Field>
                        <Field label="Pincode" error={errors.pincode}>
                            <input className={inputClasses(errors.pincode)} value={form.pincode || ''} onChange={set('pincode')} maxLength={6} />
                        </Field>
                        <Field label="Service Areas" hint="Comma separated">
                            <input className={inputClasses(false)} value={form.service_areas} onChange={set('service_areas')} />
                        </Field>
                        <div className="sm:col-span-2">
                            <Field label="Certifications" hint="Comma separated, e.g. ISO 9001:2015, ISI Mark">
                                <input className={inputClasses(false)} value={form.certifications} onChange={set('certifications')} />
                            </Field>
                        </div>
                    </div>
                </Card>

                <div className="flex justify-end gap-3">
                    <PrimaryButton type="submit" disabled={saving}>
                        {saving ? 'Saving…' : 'Save Changes'}
                    </PrimaryButton>
                </div>
            </form>
        </div>
    );
};

export default VendorProfilePage;
