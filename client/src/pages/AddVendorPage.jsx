import React, { useState } from 'react';
import AddVendorHeader from '../components/vendor/AddVendorHeader';
import AddVendorForm from '../components/vendor/AddVendorForm';
import { useNavigate } from 'react-router-dom';
import vendorService from '../services/vendorService';
import { useToast } from '../context/ToastContext';

const AddVendorPage = () => {
    const navigate = useNavigate();
    const { success, error: showError } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (data) => {
        setIsSubmitting(true);
        try {
            await vendorService.create(data);
            success('Vendor added successfully!');
            navigate('/vendors');
        } catch (err) {
            const detail = err?.response?.data?.detail;
            const msg = typeof detail === 'string'
                ? detail
                : Array.isArray(detail)
                    ? detail.map(d => d.msg).join(', ')
                    : 'Failed to add vendor. Please try again.';
            showError(msg);
            console.error('Vendor creation failed:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-[calc(100vh-4rem)] bg-gray-50/50 dark:bg-black p-6 md:p-10 font-sans flex justify-center">

            <div className="w-full max-w-3xl">
                {/* Header */}
                <AddVendorHeader />

                {/* Form Card */}
                <AddVendorForm
                    onSubmit={handleSubmit}
                    isSubmitting={isSubmitting}
                />
            </div>
        </div>
    );
};

export default AddVendorPage;
