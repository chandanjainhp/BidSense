import React from 'react';

const ChatHeader = ({ isSidebarOpen, onToggleSidebar, title, onClearContext }) => {
    return (
        <header className="h-14 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between px-6 bg-white dark:bg-gray-900 backdrop-blur-xl z-10 w-full transition-colors">
            <div className="flex items-center">
                <button
                    onClick={onToggleSidebar}
                    className={`mr-4 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all ${isSidebarOpen ? 'rotate-180' : ''}`}
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
                </button>
                <div className="flex items-center space-x-2">
                    <h2 className="font-bold text-gray-900 dark:text-white text-md truncate max-w-[200px] md:max-w-md">{title}</h2>
                    <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 text-[10px] font-bold rounded-md uppercase">AI Mode</span>
                </div>
            </div>

            <div className="flex items-center space-x-2">
                {/* Export Chat Button */}
                <button className="p-2 text-gray-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors" title="Export Chat">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                </button>

                {/* Clear Context Button */}
                <button
                    onClick={onClearContext}
                    className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    title="Clear Context"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
            </div>
        </header>
    );
};

export default ChatHeader;
