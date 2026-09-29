import { useState, useEffect, useCallback } from 'react';
import { vendorApi } from '../api/vendorApi';

/**
 * Fetch the current user's vendor profile.
 * Returns { vendor, loading, error, refresh, isVendor, hasProfile }.
 */
export const useVendorProfile = () => {
    const [vendor, setVendor] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const refresh = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await vendorApi.getMe();
            setVendor(res.data);
            return res.data;
        } catch (err) {
            const status = err?.response?.status;
            if (status !== 404) {
                setError(err);
            }
            setVendor(null);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            refresh();
        } else {
            setLoading(false);
        }
    }, [refresh]);

    return {
        vendor,
        loading,
        error,
        refresh,
        isVendor: !!vendor,
    };
};

/**
 * Simple polling fetcher for lists.
 */
export const useFetch = (fetcher, deps = []) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetcher();
            setData(res.data);
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);

    useEffect(() => {
        load();
    }, [load]);

    return { data, loading, error, reload: load };
};

export default useVendorProfile;
