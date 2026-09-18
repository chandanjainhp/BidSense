import React, { useState, useEffect } from 'react';
import VendorHeader from '../components/vendor/VendorHeader';
import VendorMetrics from '../components/vendor/VendorMetrics';
import VendorFilterBar from '../components/vendor/VendorFilterBar';
import VendorTable from '../components/vendor/VendorTable';
import vendorService from '../services/vendorService';
import { useToast } from '../context/ToastContext';

const VendorManagementPage = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('All');
    const { success, error: showError } = useToast();

    const [vendors, setVendors] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchVendors = async () => {
            try {
                const response = await vendorService.getAll({ page_size: 50 });
                const mapped = response.data.map(v => ({
                    id: v.id,
                    name: v.name,
                    industry: v.industry || 'Other',
                    contact: v.email,
                    contactName: v.contact_name,
                    phone: v.phone,
                    website: v.website,
                    status: v.status ? v.status.charAt(0).toUpperCase() + v.status.slice(1) : 'Pending',
                    projects: 0,
                }));
                setVendors(mapped);
                const activeCount = mapped.filter(v => v.status === 'Active').length;
                if (activeCount > 0) {
                    success(`${activeCount} active vendor${activeCount === 1 ? '' : 's'} in your network.`);
                }
            } catch (err) {
                console.error('Failed to fetch vendors:', err);
                showError('Failed to load vendors. Is the backend running?');
            } finally {
                setLoading(false);
            }
        };
        fetchVendors();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const filteredVendors = vendors.filter(vendor => {
        const matchesSearch = vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            vendor.industry.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filterStatus === 'All' || vendor.status === filterStatus;
        return matchesSearch && matchesFilter;
    });

    return (
        <div className="min-h-[calc(100vh-4rem)] bg-gray-50 dark:bg-black p-6 md:p-10 font-sans transition-colors duration-300">

            {/* Page Header */}
            <VendorHeader />

            {/* Metrics Overview */}
            <VendorMetrics />

            {/* Content Container */}
            <div className="bg-white dark:bg-gray-900/50 backdrop-blur-xl rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 md:p-8 transition-colors">

                {/* Filters & Search */}
                <VendorFilterBar
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    filterStatus={filterStatus}
                    setFilterStatus={setFilterStatus}
                />

                {/* Vendors Table */}
                {loading ? (
                    <div className="space-y-3">
                        {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-14 bg-gray-50 dark:bg-gray-800/50 rounded-xl animate-pulse" />)}
                    </div>
                ) : (
                    <VendorTable filteredVendors={filteredVendors} />
                )}
            </div>

        </div>
    );
};

export default VendorManagementPage;
