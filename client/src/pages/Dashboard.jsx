import React from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardHeader from '../components/dashboard/DashboardHeader';
import StatsGrid from '../components/dashboard/StatsGrid';
import ActiveRfps from '../components/dashboard/ActiveRfps';
import AiInsights from '../components/dashboard/AiInsights';
import ActivityFeed from '../components/dashboard/ActivityFeed';
import DashboardFooter from '../components/dashboard/DashboardFooter';
import SEO from '../components/common/SEO';
import PageTransition from '../components/common/PageTransition';

const Dashboard = () => {
  const navigate = useNavigate();

  return (
    <PageTransition className="min-h-screen bg-gray-50/50 dark:bg-black p-6 font-sans transition-colors duration-300">
      <SEO title="Dashboard" />

      {/* --- Header Section --- */}
      <DashboardHeader onCreateRfp={() => navigate('/rfps/create')} />

      {/* --- KPI Stats Grid --- */}
      <StatsGrid />

      {/* --- Main Dashboard Content --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left Column: Active RFPs */}
        <div className="lg:col-span-2 space-y-8">
          <ActiveRfps />
        </div>

        {/* Right Column: AI Insights & Activity */}
        <div className="space-y-8">

          {/* BidSense AI Insights Panel */}
          <AiInsights />

          {/* Recent Activity Feed */}
          <ActivityFeed />
        </div>
      </div>

      {/* --- Footer --- */}
      <DashboardFooter />
    </PageTransition>
  );
};

export default Dashboard;