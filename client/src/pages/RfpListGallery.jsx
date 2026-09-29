import React, { useState, useEffect } from 'react';
import RfpListHeader from '../components/rfp/RfpListHeader';
import RfpFilterBar from '../components/rfp/RfpFilterBar';
import RfpCard from '../components/rfp/RfpCard';
import SEO from '../components/common/SEO';
import rfpService from '../services/rfpService';
import { useToast } from '../context/ToastContext';

const STATUS_MAP = {
  draft: 'Draft',
  open: 'Active',
  closed: 'Closed',
  awarded: 'Awarded',
  cancelled: 'Cancelled',
};

const RfpListGallery = () => {
  const { info, error: showError } = useToast();

  const [rfps, setRfps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    const fetchRfps = async () => {
      try {
        const response = await rfpService.getAll({ page_size: 50 });
        const mapped = response.data.map(rfp => ({
          id: rfp.id,
          title: rfp.title,
          status: STATUS_MAP[rfp.status] || rfp.status,
          deadline: rfp.dueDate,
          vendors: rfp.vendorCount ?? 0,
          proposals: 0,
          aiStatus: 'Monitoring Bids',
          progress: rfp.status === 'closed' || rfp.status === 'awarded' ? 100 : 50,
        }));
        setRfps(mapped);
        const activeCount = mapped.filter(r => r.status === 'Active').length;
        if (activeCount > 0) {
          info(`You have ${activeCount} active RFP${activeCount === 1 ? '' : 's'} in progress.`);
        }
      } catch (err) {
        console.error('Failed to fetch RFPs:', err);
        showError('Failed to load RFPs. Is the backend running?');
      } finally {
        setLoading(false);
      }
    };
    fetchRfps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredRfps = rfps.filter(r => filter === 'All' || r.status === filter);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black p-6 md:p-10 font-sans">
      <SEO title="RFP Gallery" description="View and manage all your active and historical RFPs." />

      {/* --- Header Section --- */}
      <RfpListHeader />

      {/* --- Filter Bar --- */}
      <RfpFilterBar filter={filter} setFilter={setFilter} />

      {/* --- Gallery Grid --- */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {loading ? (
          [1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-64 bg-white dark:bg-gray-900/50 rounded-3xl animate-pulse" />
          ))
        ) : filteredRfps.length > 0 ? (
          filteredRfps.map((rfp) => (
            <RfpCard key={rfp.id} rfp={rfp} />
          ))
        ) : (
          <div className="col-span-full text-center py-16">
            <p className="text-gray-500 dark:text-gray-400">No RFPs found{filter !== 'All' ? ` for "${filter}"` : ''}.</p>
          </div>
        )}
      </div>

      {/* --- Footer Pagination --- */}
      <footer className="max-w-7xl mx-auto mt-12 flex items-center justify-center space-x-4">
        <button className="p-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-400 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 disabled:opacity-30" disabled>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <span className="text-sm font-bold text-gray-500 dark:text-gray-400">Page 1</span>
        <button className="p-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-400 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
        </button>
      </footer>
    </div>
  );
};

export default RfpListGallery;
