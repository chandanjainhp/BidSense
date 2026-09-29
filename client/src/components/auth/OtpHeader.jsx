import React from 'react';

const OtpHeader = () => {
    return (
        <div className="mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-cyan-50 dark:bg-cyan-500/10 rounded-2xl mb-6 border border-cyan-100 dark:border-cyan-500/20">
                <svg className="w-8 h-8 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
            </div>
            <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                Verify Your Email
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm leading-relaxed">
                We’ve sent a 6-digit verification code to <br />
                <span className="font-semibold text-gray-800 dark:text-gray-200">user@company.com</span>
            </p>
        </div>
    );
};

export default OtpHeader;
