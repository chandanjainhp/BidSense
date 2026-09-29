import React from 'react';

const FlowCardGrid = ({ children }) => {
    return (
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {/* Connector line threading through the card gaps (desktop only) */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute left-8 right-8 top-32 hidden h-px bg-gradient-to-r from-transparent via-slate-300/70 to-transparent lg:block dark:via-slate-700/60"
            />
            <div className="relative grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8 lg:grid-cols-3">
                {children}
            </div>
        </div>
    );
};

export default FlowCardGrid;
