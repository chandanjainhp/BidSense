// Formatting helpers for the vendor marketplace UI.

export const formatCurrency = (value, currency = 'INR') => {
    if (value === null || value === undefined || isNaN(Number(value))) return '—';
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency,
        maximumFractionDigits: 0,
    }).format(Number(value));
};

export const formatDate = (value) => {
    if (!value) return '—';
    const d = new Date(value);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const formatDateTime = (value) => {
    if (!value) return '—';
    const d = new Date(value);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('en-IN', {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    });
};

export const formatNumber = (value) => {
    if (value === null || value === undefined || isNaN(Number(value))) return '—';
    return new Intl.NumberFormat('en-IN').format(Number(value));
};

// ---- Validation (mirrors backend rules) -----------------------------------

export const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]{3}$/;
export const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
export const PHONE_RE = /^(\+91|0)?[6-9][0-9]{9}$/;
export const PINCODE_RE = /^[1-9][0-9]{5}$/;

export const isValidGstin = (v) => GSTIN_RE.test((v || '').trim().toUpperCase());
export const isValidPan = (v) => PAN_RE.test((v || '').trim().toUpperCase());
export const isValidPhone = (v) => {
    const digits = (v || '').replace(/[\s\-()]/g, '');
    return PHONE_RE.test(digits);
};
export const isValidPincode = (v) => PINCODE_RE.test((v || '').trim());

/**
 * Validate bulk pricing tiers: ranges must be ascending and non-overlapping,
 * with at most one open-ended tier placed last.
 * Returns an array of error strings (empty when valid).
 */
export const validateTiers = (tiers) => {
    const errors = [];
    const cleaned = (tiers || [])
        .map(t => ({ ...t, min_quantity: Number(t.min_quantity), max_quantity: t.max_quantity === null || t.max_quantity === '' || t.max_quantity === undefined ? null : Number(t.max_quantity), unit_price: Number(t.unit_price) }))
        .filter(t => t.min_quantity > 0 || t.max_quantity !== null);

    if (cleaned.length === 0) {
        errors.push('Add at least one pricing tier.');
        return errors;
    }

    const sorted = [...cleaned].sort((a, b) => a.min_quantity - b.min_quantity);
    let prevMax = null;

    sorted.forEach((t, idx) => {
        if (!t.min_quantity || t.min_quantity < 1) {
            errors.push(`Tier ${idx + 1}: minimum quantity must be at least 1.`);
        }
        if (t.unit_price <= 0) {
            errors.push(`Tier ${idx + 1}: unit price must be greater than 0.`);
        }
        if (t.max_quantity !== null && t.max_quantity < t.min_quantity) {
            errors.push(`Tier ${idx + 1}: max quantity must be ≥ min quantity.`);
        }
        if (prevMax !== null && t.min_quantity <= prevMax) {
            errors.push(`Tier ${idx + 1} starts at ${t.min_quantity} but the previous tier already covers up to ${prevMax}. Ranges cannot overlap.`);
        }
        prevMax = t.max_quantity;
    });

    const openTiers = sorted.filter(t => t.max_quantity === null);
    if (openTiers.length > 1) {
        errors.push('Only one open-ended tier ("500+" style) is allowed.');
    }
    if (openTiers.length === 1 && sorted[sorted.length - 1].max_quantity !== null) {
        errors.push('The open-ended tier must be the last (highest) tier.');
    }

    return errors;
};

export const tierLabel = (t) => {
    if (t.max_quantity === null) return `${formatNumber(t.min_quantity)}+ units`;
    return `${formatNumber(t.min_quantity)} – ${formatNumber(t.max_quantity)} units`;
};

/**
 * Find the pricing tier that covers `quantity` (null when none applies).
 * Ranges are [min_quantity, max_quantity]; max_quantity === null is open-ended.
 */
export const resolveTier = (tiers, quantity) => {
    const qty = Number(quantity) || 0;
    return (tiers || []).find(
        (t) => qty >= Number(t.min_quantity) &&
            (t.max_quantity === null || t.max_quantity === undefined || qty <= Number(t.max_quantity))
    ) || null;
};

/**
 * Total for a quantity under a tier: unit price × qty, then the bulk-sale
 * discount applied. Returns { unitPrice, subtotal, discountPercent, total }.
 */
export const calculateTotal = (tiers, quantity, { fallbackPrice = 0, discountPercent = 0 } = {}) => {
    const qty = Math.max(0, Number(quantity) || 0);
    const tier = resolveTier(tiers, qty);
    const unitPrice = tier ? Number(tier.unit_price) : Number(fallbackPrice) || 0;
    const subtotal = unitPrice * qty;
    const pct = Number(discountPercent) || 0;
    const total = subtotal * (1 - pct / 100);
    return {
        tier,
        unitPrice,
        subtotal,
        discountPercent: pct,
        discountAmount: subtotal - total,
        total,
    };
};

export const STATUS_STYLES = {
    // vendor / listing / inquiry / quotation / order statuses
    pending: 'bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400',
    draft: 'bg-gray-100 text-gray-700 dark:bg-gray-500/10 dark:text-gray-400',
    published: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400',
    verified: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400',
    accepted: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400',
    completed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400',
    delivered: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400',
    confirmed: 'bg-blue-100 text-blue-800 dark:bg-blue-500/10 dark:text-blue-400',
    processing: 'bg-blue-100 text-blue-800 dark:bg-blue-500/10 dark:text-blue-400',
    shipped: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-500/10 dark:text-indigo-400',
    quoted: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-500/10 dark:text-indigo-400',
    sent: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-500/10 dark:text-indigo-400',
    viewed: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-500/10 dark:text-cyan-400',
    converted: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400',
    unpublished: 'bg-gray-100 text-gray-600 dark:bg-gray-500/10 dark:text-gray-400',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-400',
    suspended: 'bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-400',
    cancelled: 'bg-gray-100 text-gray-600 dark:bg-gray-500/10 dark:text-gray-400',
    expired: 'bg-gray-100 text-gray-600 dark:bg-gray-500/10 dark:text-gray-400',
    available: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400',
    unavailable: 'bg-gray-100 text-gray-600 dark:bg-gray-500/10 dark:text-gray-400',
    on_request: 'bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400',
};

export const StatusBadge = ({ status }) => {
    const style = STATUS_STYLES[status] || STATUS_STYLES.draft;
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${style}`}>
            {(status || '').replace('_', ' ')}
        </span>
    );
};
