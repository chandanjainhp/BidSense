import React from 'react';

const PricingHeader = () => {
    return (
        <div className="pt-32 pb-12 text-center bg-white dark:bg-black">
            <div className="max-w-7xl mx-auto px-6">
                <h1 className="text-4xl md:text-6xl font-black text-gray-900 dark:text-white mb-6 tracking-tight">
                    Simple, transparent pricing.
                </h1>
                <p className="text-xl text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
                    Choose the plan that's right for your team. All plans include a 14-day free trial.
                </p>
            </div>
        </div>
    );
};

export default PricingHeader;
