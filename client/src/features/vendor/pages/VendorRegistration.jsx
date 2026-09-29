import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { vendorApi } from '../api/vendorApi';
import { useToast } from '../../../context/ToastContext';
import { Field, inputClasses, PrimaryButton } from '../components/common';
import { isValidGstin, isValidPan, isValidPhone, isValidPincode } from '../utils/format.jsx';
import logo from '../../../assets/logo-round.jpg';

const initialForm = {
    full_name: '', email: '', password: '',
    business_name: '', contact_name: '', phone: '',
    gstin: '', pan: '', business_category: '', description: '',
    address_line: '', city: '', state: '', pincode: '',
    service_areas: '', website: '',
};

const CATEGORIES = [
    'Industrial Equipment', 'Safety Equipment', 'Packaging', 'Electronics',
    'Office Supplies', 'Raw Materials', 'IT Services', 'Logistics',
    'Construction', 'Consulting', 'Other',
];

const VendorRegistration = () => {
    const navigate = useNavigate();
    const { success, error: showError } = useToast();
    const [form, setForm] = useState(initialForm);
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);

    const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

    const validate = () => {
        const errs = {};
        if (!form.business_name || form.business_name.trim().length < 2) errs.business_name = 'Business name is required';
        if (!form.contact_name || form.contact_name.trim().length < 2) errs.contact_name = 'Contact person is required';
        if (!form.email || !/^\S+@\S+\.\S+$/.test(form.email)) errs.email = 'Valid email is required';
        if (!form.phone || !isValidPhone(form.phone)) errs.phone = 'Valid 10-digit Indian phone required';
        if (form.gstin && !isValidGstin(form.gstin)) errs.gstin = 'Invalid GSTIN (e.g. 27ABCDE1234F1Z5)';
        if (form.pan && !isValidPan(form.pan)) errs.pan = 'Invalid PAN (e.g. ABCDE1234F)';
        if (form.pincode && !isValidPincode(form.pincode)) errs.pincode = 'Invalid 6-digit pincode';
        if (!form.business_category) errs.business_category = 'Select a category';
        if (!localStorage.getItem('token')) {
            if (!form.full_name || form.full_name.trim().length < 2) errs.full_name = 'Your name is required';
            if (!form.password || form.password.length < 8) errs.password = 'Min 8 characters';
            else if (!/[A-Z]/.test(form.password) || !/\d/.test(form.password)) errs.password = 'Needs 1 uppercase + 1 number';
        }
        return errs;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const errs = validate();
        setErrors(errs);
        if (Object.keys(errs).length > 0) return;

        setLoading(true);
        try {
            const payload = {
                ...form,
                gstin: form.gstin || undefined,
                pan: form.pan || undefined,
                service_areas: form.service_areas
                    ? form.service_areas.split(',').map(s => s.trim()).filter(Boolean)
                    : [],
                website: form.website || undefined,
            };
            if (localStorage.getItem('token')) {
                delete payload.password;
                delete payload.full_name;
            }
            const res = await vendorApi.register(payload);
            success(res.data?.debug_otp
                ? `Registered! Verify your email. OTP: ${res.data.debug_otp}`
                : 'Registration received! Check your email to verify your account.');
            if (!localStorage.getItem('token')) {
                navigate(`/otp-verification?email=${encodeURIComponent(form.email)}`);
            } else {
                navigate('/vendor/dashboard');
            }
        } catch (err) {
            const detail = err?.response?.data?.detail;
            const fields = err?.response?.data?.fields;
            if (fields) setErrors(fields);
            showError(typeof detail === 'string' ? detail : 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-black py-10 px-4">
            <div className="max-w-3xl mx-auto">
                <div className="text-center mb-8">
                    <img src={logo} alt="BidSense" className="h-12 w-auto mx-auto mb-4 rounded-xl p-0.5 bg-white" />
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Register as a Vendor</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">
                        List your products and services on the BidSense marketplace
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900/50 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 sm:p-8 space-y-8">
                    {!localStorage.getItem('token') && (
                        <section>
                            <h2 className="text-sm font-bold uppercase tracking-wider text-indigo-600 mb-4">Account</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Field label="Your Name" error={errors.full_name}>
                                    <input className={inputClasses(errors.full_name)} value={form.full_name} onChange={set('full_name')} placeholder="Jane Doe" />
                                </Field>
                                <Field label="Email" error={errors.email}>
                                    <input type="email" className={inputClasses(errors.email)} value={form.email} onChange={set('email')} placeholder="jane@company.com" />
                                </Field>
                                <Field label="Password" error={errors.password} hint="Min 8 chars, 1 uppercase, 1 number">
                                    <input type="password" className={inputClasses(errors.password)} value={form.password} onChange={set('password')} placeholder="••••••••" />
                                </Field>
                            </div>
                        </section>
                    )}

                    <section>
                        <h2 className="text-sm font-bold uppercase tracking-wider text-indigo-600 mb-4">Business Details</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="sm:col-span-2">
                                <Field label="Business / Company Name *" error={errors.business_name}>
                                    <input className={inputClasses(errors.business_name)} value={form.business_name} onChange={set('business_name')} placeholder="Acme Industrial Supplies" />
                                </Field>
                            </div>
                            <Field label="Owner / Contact Person *" error={errors.contact_name}>
                                <input className={inputClasses(errors.contact_name)} value={form.contact_name} onChange={set('contact_name')} placeholder="Jane Doe" />
                            </Field>
                            <Field label="Phone *" error={errors.phone}>
                                <input className={inputClasses(errors.phone)} value={form.phone} onChange={set('phone')} placeholder="9876543210" />
                            </Field>
                            <Field label="GSTIN" error={errors.gstin} hint="15-character GST identification number">
                                <input className={inputClasses(errors.gstin)} value={form.gstin} onChange={set('gstin')} placeholder="27ABCDE1234F1Z5" maxLength={15} />
                            </Field>
                            <Field label="PAN" error={errors.pan}>
                                <input className={inputClasses(errors.pan)} value={form.pan} onChange={set('pan')} placeholder="ABCDE1234F" maxLength={10} />
                            </Field>
                            <Field label="Business Category *" error={errors.business_category}>
                                <select className={inputClasses(errors.business_category)} value={form.business_category} onChange={set('business_category')}>
                                    <option value="">Select category</option>
                                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </Field>
                            <Field label="Website">
                                <input className={inputClasses(false)} value={form.website} onChange={set('website')} placeholder="https://yourcompany.com" />
                            </Field>
                            <div className="sm:col-span-2">
                                <Field label="Business Description">
                                    <textarea rows={3} className={inputClasses(false)} value={form.description} onChange={set('description')} placeholder="What does your business offer?" />
                                </Field>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-sm font-bold uppercase tracking-wider text-indigo-600 mb-4">Address & Service Area</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="sm:col-span-2">
                                <Field label="Address">
                                    <input className={inputClasses(false)} value={form.address_line} onChange={set('address_line')} placeholder="Street, area" />
                                </Field>
                            </div>
                            <Field label="City">
                                <input className={inputClasses(false)} value={form.city} onChange={set('city')} placeholder="Mumbai" />
                            </Field>
                            <Field label="State">
                                <input className={inputClasses(false)} value={form.state} onChange={set('state')} placeholder="Maharashtra" />
                            </Field>
                            <Field label="Pincode" error={errors.pincode}>
                                <input className={inputClasses(errors.pincode)} value={form.pincode} onChange={set('pincode')} placeholder="400001" maxLength={6} />
                            </Field>
                            <Field label="Service Areas" hint="Comma separated cities/regions">
                                <input className={inputClasses(false)} value={form.service_areas} onChange={set('service_areas')} placeholder="Mumbai, Pune, Nashik" />
                            </Field>
                        </div>
                    </section>

                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        <PrimaryButton type="submit" disabled={loading} className="flex-1">
                            {loading ? 'Submitting…' : 'Complete Registration'}
                        </PrimaryButton>
                        <button type="button" onClick={() => navigate(-1)} className="px-6 py-2.5 rounded-xl text-sm font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-white">
                            Cancel
                        </button>
                    </div>
                    <p className="text-xs text-gray-400 text-center">
                        After registering, verify your email via OTP. Your profile will be reviewed by our team before going live.
                    </p>
                </form>
            </div>
        </div>
    );
};

export default VendorRegistration;
