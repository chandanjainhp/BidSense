import React, { useState, useEffect } from 'react';
import SEO from '../components/common/SEO';
import ReviewProposal from '../components/ReviewProposal';
import ProposalHeader from '../components/proposal/ProposalHeader';
import ProposalFilters from '../components/proposal/ProposalFilters';
import ProposalTable from '../components/proposal/ProposalTable';
import proposalService from '../services/proposalService';
import { useToast } from '../context/ToastContext';

const STATUS_MAP = {
  pending: 'Pending',
  under_review: 'Under Review',
  scored: 'Scored',
  shortlisted: 'Shortlisted',
  rejected: 'Rejected',
};

const ProposalInboxPage = () => {
  const { warning, error: showError } = useToast();

  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProposals = async () => {
      try {
        const response = await proposalService.getAll({ page_size: 50 });
        const mapped = response.data.map(p => ({
          id: p.id,
          vendor: p.vendor_name || 'Unknown vendor',
          rfp: p.rfp_title || 'Unknown RFP',
          date: (p.submitted_at || '').slice(0, 10),
          status: STATUS_MAP[p.status] || p.status,
          score: p.ai_score != null ? Math.round(p.ai_score) : null,
          amount: p.amount != null ? `$${Number(p.amount).toLocaleString()}` : '—',
          aiInsight: p.ai_summary || 'Awaiting AI analysis',
          raw: p,
        }));
        setProposals(mapped);
        const pendingCount = mapped.filter(p => p.status === 'Pending' || p.status === 'Under Review').length;
        if (pendingCount > 0) {
          warning(`${pendingCount} proposal(s) require your attention.`);
        }
      } catch (err) {
        console.error('Failed to fetch proposals:', err);
        showError('Failed to load proposals. Is the backend running?');
      } finally {
        setLoading(false);
      }
    };
    fetchProposals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('score');
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState(null);

  const parseAmount = (a) => (typeof a === 'string' ? Number(a.replace(/[$,]/g, '')) || 0 : a ?? 0);

  const filteredProposals = proposals
    .filter((p) => {
      const q = searchTerm.trim().toLowerCase();
      const matchesSearch = !q
        || p.vendor.toLowerCase().includes(q)
        || p.rfp.toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'budget_asc': return parseAmount(a.amount) - parseAmount(b.amount);
        case 'budget_desc': return parseAmount(b.amount) - parseAmount(a.amount);
        case 'newest': return (b.date || '').localeCompare(a.date || '');
        case 'score':
        default: return (b.score ?? -1) - (a.score ?? -1);
      }
    });

  const handleOpenReview = (proposal) => {
    setSelectedProposal(proposal);
    setIsReviewOpen(true);
  };

  const handleCloseReview = () => {
    setIsReviewOpen(false);
    setSelectedProposal(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black p-4 md:p-8 font-sans transition-colors duration-300">
      <SEO title="Proposal Inbox" />

      {/* 1. Header Section */}
      <ProposalHeader />

      {/* --- Filters & Search Bar --- */}
      <ProposalFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        sortBy={sortBy}
        setSortBy={setSortBy}
      />

      {/* --- Proposals Table --- */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-14 bg-white dark:bg-gray-900/50 rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <ProposalTable
          proposals={filteredProposals}
          totalCount={proposals.length}
          filteredCount={filteredProposals.length}
          onReview={handleOpenReview}
        />
      )}

      {/* --- Review Proposal Slide-over --- */}
      <ReviewProposal
        isOpen={isReviewOpen}
        onClose={handleCloseReview}
        proposal={selectedProposal}
      />

    </div>
  );
};

export default ProposalInboxPage;