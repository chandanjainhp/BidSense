import React from 'react';

const FlowHeader = () => {
    return (
        <div className="mx-auto mb-16 max-w-3xl px-4 text-center md:mb-20">
            <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-indigo-200/80 bg-indigo-50 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-indigo-600 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-400">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                How it works
            </span>
            <h2 className="mb-5 text-4xl font-black tracking-tight text-gray-900 dark:text-white md:text-5xl">
                Built for every <br className="hidden md:block" />
                <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent dark:from-indigo-400 dark:to-violet-400">
                    procurement need
                </span>
            </h2>
            <p className="text-lg font-medium leading-relaxed text-gray-600 dark:text-gray-400 md:text-xl">
                Flexible workflows for any industry, team size, or complexity — powered by intelligent AI assistance.
            </p>
        </div>
    );
};

export default FlowHeader;
