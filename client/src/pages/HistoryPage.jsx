import React, { useState, useEffect } from 'react';
import HistoryHeader from '../components/rfp/HistoryHeader';
import HistoryFilterBar from '../components/rfp/HistoryFilterBar';
import HistoryTimeline from '../components/rfp/HistoryTimeline';
import rfpService from '../services/rfpService';

const TYPE_COLORS = {
  user: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300',
  ai: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-500/15 dark:text-cyan-300',
  vendor: 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300',
  system: 'bg-gray-100 text-gray-600 dark:bg-gray-500/15 dark:text-gray-300',
};

const HistoryPage = () => {
  const [historyItems, setHistoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        // History is per-RFP; load the user's RFPs then fetch each event trail.
        const rfpsResponse = await rfpService.getAll({ page_size: 10 });
        const rfps = rfpsResponse.data;
        if (rfps.length === 0) {
          setHistoryItems([]);
          return;
        }
        const responses = await Promise.all(
          rfps.map(rfp => rfpService.getHistory(rfp.id).catch(() => ({ data: [] })))
        );
        const events = responses.flatMap((res, idx) =>
          res.data.map(ev => ({
            id: ev.id,
            type: ev.actor_type,
            action: ev.action,
            entity: rfps[idx].title,
            user: ev.actor_name || 'System',
            time: new Date(ev.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            date: new Date(ev.created_at).toLocaleDateString(),
            description: ev.detail || ev.action,
            color: TYPE_COLORS[ev.actor_type] || TYPE_COLORS.system,
          }))
        );
        events.sort((a, b) => new Date(b.date) - new Date(a.date));
        setHistoryItems(events);
      } catch (err) {
        console.error('Failed to fetch history:', err);
        setError('Failed to load history. Is the backend running?');
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black p-6 md:p-10 font-sans transition-colors duration-300">

      {/* 1️⃣ Page Header */}
      <HistoryHeader />

      {/* 2️⃣ Filter Bar */}
      <HistoryFilterBar />

      {/* 3️⃣ History Timeline / List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-white dark:bg-gray-900/50 rounded-2xl animate-pulse" />)}
        </div>
      ) : error ? (
        <p className="text-red-500 text-sm">{error}</p>
      ) : (
        <HistoryTimeline historyItems={historyItems} />
      )}

    </div>
  );
};

export default HistoryPage;