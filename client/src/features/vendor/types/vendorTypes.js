// Shared TypeScript-style JSDoc types for the vendor marketplace feature.

/**
 * @typedef {'pending'|'verified'|'rejected'|'suspended'} VendorStatus
 */

/**
 * @typedef {Object} VendorProfile
 * @property {string} id
 * @property {string} business_name
 * @property {string} contact_name
 * @property {string} contact_email
 * @property {string} contact_phone
 * @property {string|null} gstin
 * @property {string|null} pan
 * @property {string} business_category
 * @property {string|null} description
 * @property {string|null} address_line
 * @property {string|null} city
 * @property {string|null} state
 * @property {string|null} pincode
 * @property {string[]|null} service_areas
 * @property {string|null} website
 * @property {string|null} logo_url
 * @property {string[]|null} certifications
 * @property {string[]|null} documents
 * @property {VendorStatus} status
 * @property {string|null} verification_note
 * @property {string|null} verified_at
 * @property {string} created_at
 * @property {string} updated_at
 */

/**
 * @typedef {'draft'|'pending'|'published'|'unpublished'|'rejected'} ListingStatus
 */

/**
 * @typedef {Object} Product
 * @property {string} id
 * @property {string} vendor_id
 * @property {string} name
 * @property {string|null} sku
 * @property {string|null} description
 * @property {string} category
 * @property {number|null} price
 * @property {number|null} stock
 * @property {string} unit
 * @property {number} moq
 * @property {Object|null} specifications
 * @property {string[]|null} images
 * @property {ListingStatus} status
 * @property {string} created_at
 * @property {string} updated_at
 */

/**
 * @typedef {Object} Service
 * @property {string} id
 * @property {string} vendor_id
 * @property {string} name
 * @property {string|null} description
 * @property {string} category
 * @property {number|null} base_price
 * @property {string} pricing_unit
 * @property {number} min_quantity
 * @property {string[]|null} service_area
 * @property {string} availability
 * @property {string|null} delivery_time
 * @property {string[]|null} images
 * @property {string[]|null} documents
 * @property {string|null} terms
 * @property {ListingStatus} status
 */

/**
 * @typedef {Object} BulkTier
 * @property {string} [id]
 * @property {number} min_quantity
 * @property {number|null} max_quantity
 * @property {number} unit_price
 */

/**
 * @typedef {Object} BulkSale
 * @property {string} id
 * @property {string} product_id
 * @property {number} min_order_quantity
 * @property {number|null} max_order_quantity
 * @property {number} bulk_discount_percent
 * @property {boolean} is_active
 * @property {string|null} starts_at
 * @property {string|null} ends_at
 * @property {BulkTier[]} tiers
 * @property {string} created_at
 * @property {string} updated_at
 */

/**
 * @typedef {'pending'|'viewed'|'quoted'|'accepted'|'rejected'|'cancelled'} InquiryStatus
 */

/**
 * @typedef {Object} Inquiry
 * @property {string} id
 * @property {string} buyer_id
 * @property {string} vendor_id
 * @property {string|null} product_id
 * @property {string|null} service_id
 * @property {number} quantity
 * @property {number|null} target_price
 * @property {string} delivery_location
 * @property {string|null} required_date
 * @property {string|null} message
 * @property {InquiryStatus} status
 * @property {string} created_at
 */

/**
 * @typedef {'sent'|'accepted'|'rejected'|'expired'|'converted'} QuotationStatus
 */

/**
 * @typedef {Object} QuotationItem
 * @property {string} id
 * @property {string|null} product_id
 * @property {string|null} service_id
 * @property {string} name
 * @property {number} quantity
 * @property {number} unit_price
 * @property {number} line_total
 */

/**
 * @typedef {Object} Quotation
 * @property {string} id
 * @property {string} inquiry_id
 * @property {string} vendor_id
 * @property {string} buyer_id
 * @property {string} quotation_number
 * @property {number} quantity
 * @property {number} unit_price
 * @property {number} bulk_discount_percent
 * @property {number} tax_percent
 * @property {number} shipping_fee
 * @property {number} total_amount
 * @property {string|null} valid_until
 * @property {string|null} delivery_time
 * @property {string|null} terms
 * @property {QuotationStatus} status
 * @property {QuotationItem[]} items
 */

/**
 * @typedef {'pending'|'confirmed'|'processing'|'shipped'|'delivered'|'completed'|'cancelled'} OrderStatus
 */

/**
 * @typedef {Object} Order
 * @property {string} id
 * @property {string} order_number
 * @property {string} quotation_id
 * @property {string} vendor_id
 * @property {string} buyer_id
 * @property {OrderStatus} status
 * @property {number} total_amount
 * @property {string} delivery_location
 * @property {string|null} notes
 * @property {Quotation|null} quotation
 */

/**
 * @typedef {Object} DashboardStats
 * @property {number} total_products
 * @property {number} total_services
 * @property {number} active_listings
 * @property {number} bulk_sale_listings
 * @property {number} pending_inquiries
 * @property {number} pending_quotations
 * @property {number} active_orders
 * @property {number} completed_orders
 * @property {number} revenue
 * @property {Array<Object>} recent_activity
 */

export default {};
