import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import notificationService from '../services/notificationService';

/**
 * NotificationCenter Component
 * Designed as a slide-over panel for the RFP Management Platform.
 */
const NotificationCenter = ({ isOpen, onClose }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('All');

  const fetchNotifications = useCallback(async () => {
    if (!isOpen) return;
    setLoading(true);
    try {
      const response = await notificationService.getAll({ page_size: 50 });
      setNotifications(response.data.map(n => ({
        id: n.id,
        type: n.notification_type,
        title: n.title,
        message: n.body,
        time: new Date(n.created_at).toLocaleString(),
        isRead: n.is_read,
      })));
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const run = async () => {
      await fetchNotifications();
    };
    run();
  }, [fetchNotifications]);

  const markAllRead = async () => {
    try {
      await notificationService.markAllRead();
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'Unread') return !n.isRead;
    if (filter === 'AI') return n.type === 'ai';
    return true;
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* --- Backdrop --- */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* --- Slide-over Panel --- */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-sm bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl shadow-2xl z-50 flex flex-col border-l border-white/20 dark:border-gray-800"
          >

            {/* Header */}
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Notifications</h2>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                  {notifications.filter(n => !n.isRead).length} Unread Alerts
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-all"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex px-6 py-3 space-x-4 border-b border-gray-50 dark:border-gray-800/50">
              {['All', 'Unread', 'AI'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setFilter(tab)}
                  className={`text-[10px] font-black uppercase tracking-[0.15em] pb-1 border-b-2 transition-all ${filter === tab ? 'text-indigo-600 dark:text-indigo-400 border-indigo-600 dark:border-indigo-400' : 'text-gray-400 dark:text-gray-500 border-transparent hover:text-gray-600 dark:hover:text-gray-300'
                    }`}
                >
                  {tab}
                </button>
              ))}
              <button
                onClick={markAllRead}
                className="ml-auto text-[10px] font-black text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 uppercase tracking-widest transition-colors"
              >
                Mark all read
              </button>
            </div>

            {/* Notification List */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-6 space-y-4">
                  {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-50 dark:bg-gray-800/50 rounded-xl animate-pulse" />)}
                </div>
              ) : filteredNotifications.length > 0 ? (
                <div className="divide-y divide-gray-50 dark:divide-gray-800/50">
                  {filteredNotifications.map((notif) => (
                    <motion.div
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      key={notif.id}
                      className={`p-6 flex items-start space-x-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors cursor-pointer relative group ${!notif.isRead ? 'bg-indigo-50/30 dark:bg-indigo-900/10' : ''}`}
                    >
                      {!notif.isRead && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-500 rounded-r-full" />
                      )}

                      {/* Icon Mapping */}
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${notif.type === 'ai' ? 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400' :
                          notif.type === 'rfp' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' :
                            notif.type === 'vendor' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' :
                              'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                        }`}>
                        {notif.type === 'ai' && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
                        {notif.type === 'rfp' && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                        {notif.type === 'vendor' && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
                        {notif.type === 'system' && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-0.5">
                          <h4 className={`text-sm font-bold ${!notif.isRead ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'} group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors`}>
                            {notif.title}
                          </h4>
                          <span className="text-[10px] font-bold text-gray-400">{notif.time}</span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2">
                          {notif.message}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-12 text-center">
                  <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-gray-200 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">All caught up!</h3>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">No new notifications in this category.</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-800">
              <button className="w-full py-3 text-xs font-bold text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-indigo-600 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all shadow-sm">
                View All Activity
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};

export default NotificationCenter;