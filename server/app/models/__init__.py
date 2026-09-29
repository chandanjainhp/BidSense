"""Import all models so Base.metadata knows every table (used by init_db.create_all)."""
from app.models.user import User  # noqa: F401
from app.models.vendor import Vendor  # noqa: F401
from app.models.rfp import Rfp, RfpStatus, RfpInvitation, InvitationStatus, RfpEvent, RfpEventType  # noqa: F401
from app.models.proposal import Proposal, ProposalStatus  # noqa: F401
from app.models.chat import Conversation, Message, MessageRole  # noqa: F401
from app.models.notification import Notification  # noqa: F401
from app.models.activity import Activity  # noqa: F401
from app.models.settings import UserSettings  # noqa: F401
from app.models.otp import OtpCode, OtpPurpose  # noqa: F401
from app.models.document import Document, DocumentChunk, DocumentStatus  # noqa: F401

# Vendor marketplace
from app.models.vendor_profile import VendorProfile, VendorProfileStatus  # noqa: F401
from app.models.product import Product, VendorService, ListingStatus  # noqa: F401
from app.models.bulk_pricing import BulkPricing, BulkSale, VendorInquiry, InquiryStatus  # noqa: F401
from app.models.quotation import Quotation, QuotationItem, QuotationStatus  # noqa: F401
from app.models.order import Order, OrderStatus  # noqa: F401
