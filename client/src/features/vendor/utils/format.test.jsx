import { describe, it, expect } from 'vitest';
import {
    isValidGstin, isValidPan, isValidPhone, isValidPincode,
    validateTiers, tierLabel, formatCurrency, formatNumber, formatDate,
    StatusBadge,
} from './format.jsx';
import { render, screen } from '@testing-library/react';

describe('GSTIN validation (mirrors backend rule)', () => {
    it('accepts a valid 15-char GSTIN', () => {
        expect(isValidGstin('27ABCDE1234F1Z5')).toBe(true);
        expect(isValidGstin('27abcde1234f1z5')).toBe(true); // case-insensitive
    });
    it('rejects malformed GSTINs', () => {
        expect(isValidGstin('27ABCDE1234F')).toBe(false);   // too short
        expect(isValidGstin('2ABCDE1234F1Z5')).toBe(false); // 1-digit state code
        expect(isValidGstin('')).toBe(false);
        expect(isValidGstin(null)).toBe(false);
    });
});

describe('PAN validation', () => {
    it('accepts a valid PAN', () => {
        expect(isValidPan('ABCDE1234F')).toBe(true);
        expect(isValidPan('abcde1234f')).toBe(true);
    });
    it('rejects malformed PANs', () => {
        expect(isValidPan('ABCD1234F')).toBe(false);  // 4 letters
        expect(isValidPan('ABCDE1234')).toBe(false);  // missing last letter
        expect(isValidPan('')).toBe(false);
    });
});

describe('Phone & pincode validation', () => {
    it('accepts valid Indian mobile numbers', () => {
        expect(isValidPhone('9876543210')).toBe(true);
        expect(isValidPhone('+919876543210')).toBe(true);
        expect(isValidPhone('098765 43210')).toBe(true);
    });
    it('rejects invalid phone numbers', () => {
        expect(isValidPhone('1234567890')).toBe(false);  // starts with 1
        expect(isValidPhone('987654321')).toBe(false);   // 9 digits
    });
    it('accepts valid pincodes', () => {
        expect(isValidPincode('400001')).toBe(true);
    });
    it('rejects invalid pincodes', () => {
        expect(isValidPincode('000001')).toBe(false);    // starts with 0
        expect(isValidPincode('40000')).toBe(false);     // 5 digits
    });
});

describe('Bulk tier validation (frontend mirrors backend overlap rule)', () => {
    it('accepts the canonical glove example: 1-49, 50-199, 200-499, 500+', () => {
        const errs = validateTiers([
            { min_quantity: 1, max_quantity: 49, unit_price: 500 },
            { min_quantity: 50, max_quantity: 199, unit_price: 450 },
            { min_quantity: 200, max_quantity: 499, unit_price: 420 },
            { min_quantity: 500, max_quantity: null, unit_price: 390 },
        ]);
        expect(errs).toEqual([]);
    });

    it('accepts adjacent ranges that share no quantities', () => {
        const errs = validateTiers([
            { min_quantity: 1, max_quantity: 100, unit_price: 100 },
            { min_quantity: 101, max_quantity: 500, unit_price: 90 },
        ]);
        expect(errs).toEqual([]);
    });

    it('rejects overlapping ranges (1-100 + 50-500)', () => {
        const errs = validateTiers([
            { min_quantity: 1, max_quantity: 100, unit_price: 100 },
            { min_quantity: 50, max_quantity: 500, unit_price: 90 },
        ]);
        expect(errs.some(e => /overlap/i.test(e))).toBe(true);
    });

    it('rejects a price of 0 or negative', () => {
        const errs = validateTiers([{ min_quantity: 1, max_quantity: null, unit_price: 0 }]);
        expect(errs.some(e => /price must be greater than 0/i.test(e))).toBe(true);
    });

    it('rejects multiple open-ended tiers', () => {
        const errs = validateTiers([
            { min_quantity: 1, max_quantity: null, unit_price: 100 },
            { min_quantity: 500, max_quantity: null, unit_price: 90 },
        ]);
        expect(errs.some(e => /open-ended tier/i.test(e))).toBe(true);
    });

    it('requires the open-ended tier to be last', () => {
        // open tier sits in the middle after sorting → invalid
        const errs = validateTiers([
            { min_quantity: 1, max_quantity: null, unit_price: 90 },
            { min_quantity: 500, max_quantity: 1000, unit_price: 100 },
        ]);
        expect(errs.some(e => /must be the last/i.test(e))).toBe(true);
    });

    it('rejects max < min within a tier', () => {
        const errs = validateTiers([{ min_quantity: 100, max_quantity: 50, unit_price: 10 }]);
        expect(errs.some(e => /max quantity must be/i.test(e))).toBe(true);
    });

    it('rejects an empty tier list', () => {
        expect(validateTiers([]).length).toBeGreaterThan(0);
    });
});

describe('Tier label formatting', () => {
    it('formats closed ranges', () => {
        expect(tierLabel({ min_quantity: 1, max_quantity: 49 })).toBe('1 – 49 units');
    });
    it('formats open-ended ranges', () => {
        expect(tierLabel({ min_quantity: 500, max_quantity: null })).toBe('500+ units');
    });
});

describe('Currency & number formatting (en-IN)', () => {
    it('formats INR currency with Indian digit grouping', () => {
        expect(formatCurrency(119205)).toMatch(/1,19,205/);
    });
    it('renders a dash for missing values', () => {
        expect(formatCurrency(null)).toBe('—');
        expect(formatNumber(undefined)).toBe('—');
    });
    it('formats dates', () => {
        expect(formatDate('2026-09-21T10:00:00Z')).not.toBe('—');
        expect(formatDate(null)).toBe('—');
    });
});

describe('StatusBadge', () => {
    it('renders humanized status text', () => {
        render(<StatusBadge status="on_request" />);
        expect(screen.getByText('on request')).toBeInTheDocument();
    });
    it('falls back to draft styling for unknown statuses', () => {
        render(<StatusBadge status="totally_new_status" />);
        const badge = screen.getByText(/totally new/);
        expect(badge.className).toContain('bg-gray-100'); // draft fallback style
    });
});
