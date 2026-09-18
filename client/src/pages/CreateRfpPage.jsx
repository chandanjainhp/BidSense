import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CreateRfpHeader from '../components/rfp/CreateRfpHeader';
import CreateRfpForm from '../components/rfp/CreateRfpForm';
import rfpService from '../services/rfpService';
import { useToast } from '../context/ToastContext';

const CreateRfpPage = () => {
    const navigate = useNavigate();
    const { success, error: showError } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleCreateRfp = async (formData) => {
        setIsSubmitting(true);
        try {
            const response = await rfpService.create({
                title: formData.title,
                type: formData.type || 'General',
                department: formData.department || null,
                budget: formData.budget ? Number(formData.budget) : null,
                dueDate: formData.deadline || formData.dueDate || formData.due_date,
                description: formData.description || null,
            });
            success('RFP created as draft!');
            navigate('/rfps/editor', { state: { rfpId: response.data.id } });
        } catch (err) {
            const detail = err?.response?.data?.detail;
            const msg = typeof detail === 'string'
                ? detail
                : Array.isArray(detail)
                    ? detail.map(d => d.msg).join(', ')
                    : 'Failed to create RFP. Please try again.';
            showError(msg);
            console.error('RFP creation failed:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-[calc(100vh-4rem)] bg-gray-50/50 dark:bg-black p-6 md:p-10 font-sans flex justify-center transition-colors duration-300">
            <div className="w-full max-w-3xl">

                {/* Header */}
                <CreateRfpHeader />

                {/* Main Form Card */}
                <CreateRfpForm
                    onSubmit={handleCreateRfp}
                    onCancel={() => navigate('/rfps')}
                    isSubmitting={isSubmitting}
                />
            </div>
        </div>
    );
};

export default CreateRfpPage;
