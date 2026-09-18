import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import settingsService from '../../services/settingsService';
import logo from '../../assets/logo-round.jpg';

const Sidebar = ({ isSidebarOpen, setIsSidebarOpen, isCollapsed, setIsCollapsed }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { theme, toggleTheme } = useTheme();
    const [user, setUser] = useState(null);

    const navItems = [
        { name: 'Dashboard', path: '/dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
        { name: 'RFPs', path: '/rfps', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
        { name: 'Vendors', path: '/vendors', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
        { name: 'Proposals', path: '/proposals', icon: 'M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4' },
        { name: 'BidSense AI', path: '/chat', icon: 'M13 10V3L4 14h7v7l9-11h-7z', special: true },
        { name: 'History', path: '/rfps/history', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    ];

    const getActiveState = (path) => {
        if (path === '/dashboard' && location.pathname === '/') return true;
        if (path === '/rfps' && location.pathname.startsWith('/rfps/history')) return false;
        return location.pathname.startsWith(path);
    };

    useEffect(() => {
        let cancelled = false;
        settingsService.getProfile()
            .then((res) => { if (!cancelled) setUser(res.data); })
            .catch(() => { /* not logged in or backend down; leave profile empty */ });
        return () => { cancelled = true; };
    }, []);

    return (
        <aside
            className={`
        fixed inset-y-0 left-0 z-50 bg-gray-900 dark:bg-black transition-all duration-300 ease-in-out lg:relative lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}
        w-64
      `}
        >
            <div className="flex flex-col h-full">
                {/* Branding & Collapse Toggle */}

                <div className={`flex items-center h-16 px-6 bg-gray-950/50 dark:bg-gray-900/50 justify-between`}>
                    <div className={`flex items-center ${isCollapsed ? 'justify-center w-full' : ''}`}>
                        {/* Logo Image */}
                        <img
                            src={logo}
                            alt="BidSense Logo"
                            className={`transition-all duration-300 bg-white ${isCollapsed ? 'w-10 h-10 object-cover object-left rounded-full p-1' : 'h-10 w-auto rounded-xl p-1'}`}
                        />
                    </div>

                    {/* Desktop Collapse Button */}
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="hidden lg:flex p-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                    >
                        <svg className={`w-4 h-4 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                        </svg>
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto overflow-x-hidden">
                    {navItems.map((item) => (
                        <button
                            key={item.name}
                            onClick={() => {
                                navigate(item.path);
                                if (window.innerWidth < 1024) setIsSidebarOpen(false);
                            }}
                            className={`w-full flex items-center p-3 rounded-xl text-sm font-bold transition-all duration-200 group relative ${getActiveState(item.path)
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50'
                                : 'text-gray-400 hover:bg-white/5 hover:text-white'
                                }`}
                            title={isCollapsed ? item.name : ''}
                        >
                            <svg className={`w-6 h-6 flex-shrink-0 transition-all ${isCollapsed ? 'mx-auto' : 'mr-3'} ${getActiveState(item.path) ? 'text-white' : 'text-gray-500 group-hover:text-indigo-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon} />
                            </svg>

                            {!isCollapsed && (
                                <span className="truncate animate-in fade-in slide-in-from-left-2 duration-300">
                                    {item.name}
                                </span>
                            )}

                            {item.special && (
                                <span className={`absolute ${isCollapsed ? 'top-2 right-2' : 'right-3'} flex h-2 w-2 rounded-full bg-cyan-400 animate-pulse`}></span>
                            )}
                        </button>
                    ))}
                </nav>

                {/* Theme Toggle & User Profile */}
                <div className="p-4 bg-gray-950/30 border-t border-white/5 space-y-3">
                    {/* Theme Toggle Button */}
                    <button
                        onClick={toggleTheme}
                        className={`w-full flex items-center justify-center p-2.5 rounded-xl transition-all duration-200 ${theme === 'dark'
                            ? 'bg-gray-800 text-yellow-400 border border-gray-700'
                            : 'bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white'
                            } ${isCollapsed ? 'px-0' : 'px-4 space-x-3'}`}
                        title="Toggle Theme"
                    >
                        {theme === 'dark' ? (
                            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                        ) : (
                            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                        )}
                        {!isCollapsed && <span className="text-sm font-bold">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
                    </button>
                    <div
                        onClick={() => navigate('/settings')}
                        className={`flex items-center p-2 rounded-xl hover:bg-white/5 transition-all cursor-pointer ${isCollapsed ? 'justify-center' : ''}`}
                    >
                        <div className="w-10 h-10 flex-shrink-0 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 border-2 border-white/10" />
                        {!isCollapsed && (
                            <div className="ml-3 overflow-hidden text-left animate-in fade-in duration-300">
                                <p className="text-sm font-bold text-white truncate">{user?.full_name || 'My Account'}</p>
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{user?.is_verified ? 'Verified' : 'Member'}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
