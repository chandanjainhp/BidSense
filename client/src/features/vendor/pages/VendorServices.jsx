import React from 'react';
import { useNavigate } from 'react-router-dom';
import { serviceApi } from '../api/vendorApi';
import { useFetch } from '../hooks/useVendor';
import { useToast } from '../../../context/ToastContext';
import { PageHeader, Card, EmptyState, LoadingState, PrimaryButton, SecondaryButton } from '../components/common';
import { StatusBadge, formatCurrency } from '../utils/format.jsx';

const VendorServices = () => {
    const navigate = useNavigate();
    const { success, error: showError } = useToast();
    const { data, loading, reload } = useFetch(() => serviceApi.list({ page_size: 100 }), []);

    const services = data?.items || [];

    const togglePublish = async (s) => {
        const next = s.status === 'published' ? 'unpublished' : 'published';
        try {
            await serviceApi.update(s.id, { status: next });
            success(next === 'published' ? 'Service published' : 'Service unpublished');
            reload();
        } catch (err) {
            showError(err?.response?.data?.detail || 'Update failed');
        }
    };

    const handleDelete = async (s) => {
        if (!window.confirm(`Delete "${s.name}"?`)) return;
        try {
            await serviceApi.remove(s.id);
            success('Service deleted');
            reload();
        } catch (err) {
            showError(err?.response?.data?.detail || 'Delete failed');
        }
    };

    return (
        <div className="p-6 lg:p-10">
            <PageHeader
                title="Services"
                subtitle={`${services.length} service${services.length === 1 ? '' : 's'}`}
                actions={
                    <PrimaryButton onClick={() => navigate('/vendor/services/new')}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                        Add Service
                    </PrimaryButton>
                }
            />

            {loading ? (
                <LoadingState />
            ) : services.length === 0 ? (
                <Card>
                    <EmptyState
                        icon="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                        title="No services yet"
                        subtitle="Offer installations, maintenance, consulting and other services."
                        action={<PrimaryButton onClick={() => navigate('/vendor/services/new')}>Create Service</PrimaryButton>}
                    />
                </Card>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {services.map((s) => (
                        <Card key={s.id} className="p-5">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                <div className="w-14 h-14 rounded-xl bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 flex items-center justify-center flex-shrink-0">
                                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                    </svg>
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h3 className="font-bold text-gray-900 dark:text-white truncate">{s.name}</h3>
                                        <StatusBadge status={s.status} />
                                        <StatusBadge status={s.availability} />
                                    </div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                                        {s.category} • {s.base_price ? `${formatCurrency(s.base_price)} / ${s.pricing_unit}` : 'Price on request'}
                                        {s.delivery_time && ` • ${s.delivery_time}`}
                                    </p>
                                </div>

                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <SecondaryButton onClick={() => togglePublish(s)} className="!px-3 !py-2 text-xs">
                                        {s.status === 'published' ? 'Unpublish' : 'Publish'}
                                    </SecondaryButton>
                                    <SecondaryButton onClick={() => navigate(`/vendor/services/${s.id}/edit`)} className="!px-3 !py-2 text-xs">
                                        Edit
                                    </SecondaryButton>
                                    <button
                                        onClick={() => handleDelete(s)}
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

export default VendorServices;
