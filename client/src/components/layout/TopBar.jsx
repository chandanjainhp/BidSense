import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import authService from '../../services/authService';

const TopBar = ({ isSidebarOpen, setIsSidebarOpen, setIsNotifOpen }) => {
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const searchRef = useRef(null);

    // Searchable items - pages and features
    const searchableItems = [
        { name: 'Dashboard', path: '/dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', category: 'Pages' },
        { name: 'RFPs', path: '/rfps', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', category: 'Pages' },
        { name: 'Create RFP', path: '/rfps/create', icon: 'M12 4v16m8-8H4', category: 'Actions' },
        { name: 'Vendors', path: '/vendors', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4', category: 'Pages' },
        { name: 'Add Vendor', path: '/vendors/add', icon: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z', category: 'Actions' },
        { name: 'Proposals', path: '/proposals', icon: 'M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4', category: 'Pages' },
        { name: 'BidSense AI Chat', path: '/chat', icon: 'M13 10V3L4 14h7v7l9-11h-7z', category: 'Pages' },
        { name: 'History', path: '/rfps/history', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', category: 'Pages' },
        { name: 'Settings', path: '/settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z', category: 'Pages' },
    ];

    // Filter items based on search query
    const filteredItems = searchQuery.trim()
        ? searchableItems.filter(item =>
            item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.category.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : [];

    // Handle click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (searchRef.current && !searchRef.current.contains(e.target)) {
                setIsSearchOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Handle keyboard navigation
    const handleKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => Math.min(prev + 1, filteredItems.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter' && filteredItems.length > 0) {
            e.preventDefault();
            handleSelectItem(filteredItems[selectedIndex]);
        } else if (e.key === 'Escape') {
            setIsSearchOpen(false);
            setSearchQuery('');
        }
    };

    const handleSelectItem = (item) => {
        navigate(item.path);
        setSearchQuery('');
        setIsSearchOpen(false);
    };

    const handleLogout = () => {
        authService.logout();
    };

    return (
        <header className="h-16 bg-white dark:bg-gray-900 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 px-6 flex items-center sticky top-0 z-40 transition-colors">
            {/* Left Section - Mobile Menu */}
            <div className="flex items-center">
                <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="p-2 -ml-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white lg:hidden"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
            </div>

            {/* Center Section - Search Bar */}
            <div className="flex-1 flex justify-center">
                <div ref={searchRef} className="hidden md:flex relative w-full max-w-xl">
                    <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setIsSearchOpen(true);
                            setSelectedIndex(0);
                        }}
                        onFocus={() => setIsSearchOpen(true)}
                        onKeyDown={handleKeyDown}
                        placeholder="Search pages, actions..."
                        className="w-full pl-12 pr-4 py-2.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500/30 focus:bg-white dark:focus:bg-gray-800 focus:border-indigo-500 outline-none transition-all"
                    />
                    {/* Keyboard shortcut hint */}
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden lg:flex items-center space-x-1">
                        <kbd className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs font-medium rounded">⌘</kbd>
                        <kbd className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs font-medium rounded">K</kbd>
                    </div>

                    {/* Search Results Dropdown */}
                    {isSearchOpen && filteredItems.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl overflow-hidden z-50">
                            {filteredItems.map((item, index) => (
                                <button
                                    key={item.path}
                                    onClick={() => handleSelectItem(item)}
                                    className={`w-full flex items-center px-4 py-3 text-left transition-colors ${index === selectedIndex
                                            ? 'bg-indigo-600 text-white'
                                            : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                                        }`}
                                >
                                    <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon} />
                                    </svg>
                                    <div className="flex-1">
                                        <p className="font-medium">{item.name}</p>
                                        <p className={`text-xs ${index === selectedIndex ? 'text-indigo-200' : 'text-gray-500'}`}>{item.category}</p>
                                    </div>
                                    {index === selectedIndex && (
                                        <span className="text-xs text-indigo-200">Press Enter ↵</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* No results message */}
                    {isSearchOpen && searchQuery.trim() && filteredItems.length === 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl p-4 z-50">
                            <p className="text-gray-500 dark:text-gray-400 text-sm text-center">No results found for "{searchQuery}"</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Right Section - Actions */}

            <div className="flex items-center space-x-3">
                {/* Notification Button */}
                <button onClick={() => setIsNotifOpen(true)} className="relative p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-500/10 dark:text-gray-400 dark:hover:text-indigo-400 rounded-xl transition-all">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 border-2 border-white dark:border-gray-900 rounded-full"></span>
                </button>

                {/* Divider */}
                <div className="w-px h-6 bg-gray-200 dark:bg-gray-700"></div>

                {/* Dark Mode Toggle Button */}
                <button
                    onClick={toggleTheme}
                    className={`p-2 rounded-xl transition-all ${theme === 'dark'
                        ? 'text-yellow-400 hover:bg-yellow-500/10'
                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800'
                        }`}
                    title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                >
                    {theme === 'dark' ? (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                    ) : (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                        </svg>
                    )}
                </button>

                {/* Logout Button */}
                <button
                    onClick={handleLogout}
                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-500/10 dark:text-gray-400 dark:hover:text-red-400 rounded-xl transition-all"
                    title="Logout"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                </button>
            </div>
        </header>
    );
};

export default TopBar;
