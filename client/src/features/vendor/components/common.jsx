import React from 'react';

export const PageHeader = ({ title, subtitle, actions }) => (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
            {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
);

export const Card = ({ children, className = '', onClick }) => (
    <div
        onClick={onClick}
        className={`bg-white dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm ${onClick ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''} ${className}`}
    >
        {children}
    </div>
);

export const StatCard = ({ label, value, icon, color = 'indigo', onClick }) => {
    const colorMap = {
        indigo: 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
        emerald: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
        amber: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400',
        blue: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400',
        cyan: 'bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
        rose: 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400',
    };
    return (
        <Card onClick={onClick} className="p-5 relative overflow-hidden group">
            <div className="flex items-center justify-between relative z-10">
                <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400">{label}</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1.5">{value}</p>
                </div>
                <div className={`p-3 rounded-xl transition-transform group-hover:scale-110 ${colorMap[color] || colorMap.indigo}`}>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={icon} />
                    </svg>
                </div>
            </div>
        </Card>
    );
};

export const EmptyState = ({ icon = 'M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4', title, subtitle, action }) => (
    <div className="text-center py-14 px-6">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gray-50 dark:bg-gray-800 mb-4">
            <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={icon} />
            </svg>
        </div>
        <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">{title}</h3>
        {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mb-5 max-w-sm mx-auto">{subtitle}</p>}
        {action}
    </div>
);

export const LoadingState = () => (
    <div className="py-14 flex justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
    </div>
);

export const Field = ({ label, error, children, hint }) => (
    <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
            {label}
        </label>
        {children}
        {hint && !error && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
);

export const inputClasses = (hasError) =>
    `block w-full px-3.5 py-2.5 bg-white dark:bg-gray-800 border rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none transition-all focus:ring-2 ${
        hasError
            ? 'border-red-400 focus:ring-red-500/20'
            : 'border-gray-200 dark:border-gray-700 focus:ring-indigo-500/20 focus:border-indigo-500'
    }`;

export const PrimaryButton = ({ children, className = '', ...props }) => (
    <button
        className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-lg shadow-gray-900/20 dark:shadow-white/10 transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
        {...props}
    >
        {children}
    </button>
);

export const SecondaryButton = ({ children, className = '', ...props }) => (
    <button
        className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all disabled:opacity-50 ${className}`}
        {...props}
    >
        {children}
    </button>
);
