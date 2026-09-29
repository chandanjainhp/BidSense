import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVendorProfile } from '../hooks/useVendor';

/**
 * Guard for vendor-only routes.
 * - Not logged in  → redirect to /login
 * - Logged in, no vendor profile → offer registration
 * - Logged in with profile → render children
 */
const VendorRoute = ({ children }) => {
    const navigate = useNavigate();
    const { vendor, loading } = useVendorProfile();

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token && !loading) {
            navigate('/login', { replace: true });
        }
    }, [loading, navigate]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
            </div>
        );
    }

    const token = localStorage.getItem('token');
    if (!token) return null;

    if (!vendor) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black p-6">
                <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 p-8 max-w-md text-center">
                    <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">
                        <svg className="w-7 h-7 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Become a Vendor</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                        You don't have a vendor profile yet. Register your business to list products, services, and bulk offers on the marketplace.
                    </p>
                    <button
                        onClick={() => navigate('/vendor/register')}
                        className="w-full py-3 rounded-xl text-sm font-bold bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:opacity-90 transition-opacity"
                    >
                        Register as Vendor
                    </button>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="mt-3 w-full py-2.5 rounded-xl text-sm font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-white"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return children;
};

export default VendorRoute;
