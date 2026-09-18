import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SendRfpHeader from '../components/rfp/SendRfpHeader';
import RfpSelection from '../components/rfp/RfpSelection';
import InvitationMessage from '../components/rfp/InvitationMessage';
import VendorSelection from '../components/rfp/VendorSelection';
import rfpService from '../services/rfpService';
import vendorService from '../services/vendorService';
import { useToast } from '../context/ToastContext';

const SendRfpPage = () => {
    const navigate = useNavigate();
    const { success, error: showError } = useToast();
    const [selectedRfp, setSelectedRfp] = useState('');
    const [selectedVendors, setSelectedVendors] = useState([]);
    const [message, setMessage] = useState({ subject: '', body: '' });
    const [isSending, setIsSending] = useState(false);

    const [rfps, setRfps] = useState([]);
    const [vendors, setVendors] = useState([]);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [rfpsRes, vendorsRes] = await Promise.all([
                    rfpService.getAll({ page_size: 50 }),
                    vendorService.getAll({ page_size: 50 }),
                ]);
                setRfps(rfpsRes.data.map(r => ({ id: r.id, title: r.title, status: r.status })));
                setVendors(vendorsRes.data.map(v => ({
                    id: v.id,
                    name: v.name,
                    industry: v.industry || 'Other',
                    email: v.email,
                })));
            } catch (err) {
                console.error('Failed to load RFPs/vendors:', err);
                showError('Failed to load RFPs and vendors. Is the backend running?');
            }
        };
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const toggleVendor = (id) => {
        setSelectedVendors(prev =>
            prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]
        );
    };

    const handleSend = async () => {
        if (!selectedRfp || selectedVendors.length === 0) return;

        setIsSending(true);
        try {
            await rfpService.send(selectedRfp, selectedVendors, message.body || null);
            success(`RFP sent to ${selectedVendors.length} vendor${selectedVendors.length === 1 ? '' : 's'}!`);
            navigate('/rfps'); // Redirect back to Rfp list after sending
        } catch (err) {
            const detail = err?.response?.data?.detail;
            showError(typeof detail === 'string' ? detail : 'Failed to send RFP. Please try again.');
            console.error('Send RFP failed:', err);
        } finally {
            setIsSending(false);
        }
    };

    const canSend = selectedRfp && selectedVendors.length > 0;

    return (
        <div className="min-h-[calc(100vh-4rem)] bg-gray-50/50 dark:bg-black p-6 md:p-10 font-sans flex justify-center">
            <div className="w-full max-w-5xl">

                {/* Header */}
                <SendRfpHeader />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Left Column: Selection Workflow */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Step 1: Select RFP */}
                        <RfpSelection
                            rfps={rfps}
                            selectedRfp={selectedRfp}
                            setSelectedRfp={setSelectedRfp}
                        />

                        {/* Step 2: Message Configuration */}
                        <InvitationMessage
                            message={message}
                            setMessage={setMessage}
                        />

                    </div>

                    {/* Right Column: Vendor Selection */}
                    <div className="lg:col-span-1">
                        <VendorSelection
                            vendors={vendors}
                            selectedVendors={selectedVendors}
                            toggleVendor={toggleVendor}
                            onSend={handleSend}
                            isSending={isSending}
                            canSend={canSend}
                        />
                    </div>

                </div>
            </div>
        </div>
    );
};

export default SendRfpPage;
