import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import VendorRoute from '../components/VendorRoute.jsx';
import { ToastProvider } from '../../../context/ToastContext';
import ProductForm from '../pages/ProductForm.jsx';
import BulkSales from '../pages/BulkSales.jsx';
import VendorOrders from '../pages/VendorOrders.jsx';
import { vendorApi, productApi, bulkSaleApi, orderApi } from '../api/vendorApi';

vi.mock('../api/vendorApi', () => {
    const ok = (data) => Promise.resolve({ data });
    return {
        vendorApi: {
            register: vi.fn(),
            getMe: vi.fn(),
            updateMe: vi.fn(),
            getDashboard: vi.fn(),
            getPublicStores: vi.fn(),
            getPublicStore: vi.fn(),
        },
        productApi: {
            list: vi.fn(() => ok({ items: [{ id: 'p1', name: 'Industrial Gloves' }], total: 1 })),
            get: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            remove: vi.fn(),
        },
        bulkSaleApi: {
            list: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            remove: vi.fn(),
        },
        inquiryApi: { listMine: vi.fn(() => ok({ items: [], total: 0 })) },
        quotationApi: { listMine: vi.fn(() => ok({ items: [], total: 0 })) },
        orderApi: {
            listMine: vi.fn(),
            getMine: vi.fn(),
            updateStatus: vi.fn(),
        },
    };
});

const renderWithProviders = (ui, { route = '/' } = {}) =>
    render(
        <ToastProvider>
            <MemoryRouter initialEntries={[route]}>
                <Routes>
                    <Route path="/login" element={<div>Login Page</div>} />
                    <Route path="/vendor/register" element={<div>Vendor Registration Page</div>} />
                    <Route path="/dashboard" element={<div>Main Dashboard</div>} />
                    <Route path="*" element={ui} />
                </Routes>
            </MemoryRouter>
        </ToastProvider>
    );

beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
});

describe('VendorRoute guard', () => {
    it('redirects anonymous users to /login', async () => {
        vendorApi.getMe.mockImplementation(() => new Promise(() => {})); // never resolves
        renderWithProviders(
            <VendorRoute><div>Vendor Dashboard Content</div></VendorRoute>
        );
        await waitFor(() => {
            expect(screen.getByText('Login Page')).toBeInTheDocument();
        });
        expect(screen.queryByText('Vendor Dashboard Content')).not.toBeInTheDocument();
    });

    it('promotes registration for logged-in users without a vendor profile', async () => {
        localStorage.setItem('token', 'tok-123');
        vendorApi.getMe.mockRejectedValue({ response: { status: 404 } });
        renderWithProviders(
            <VendorRoute><div>Vendor Dashboard Content</div></VendorRoute>
        );
        await waitFor(() => {
            expect(screen.getByRole('button', { name: /register as vendor/i })).toBeInTheDocument();
        });
        expect(screen.queryByText('Vendor Dashboard Content')).not.toBeInTheDocument();
    });

    it('renders children for a user with a vendor profile', async () => {
        localStorage.setItem('token', 'tok-123');
        vendorApi.getMe.mockResolvedValue({ data: { id: 'v1', business_name: 'Acme', status: 'verified' } });
        renderWithProviders(
            <VendorRoute><div>Vendor Dashboard Content</div></VendorRoute>
        );
        await waitFor(() => {
            expect(screen.getByText('Vendor Dashboard Content')).toBeInTheDocument();
        });
    });

    it('shows a spinner while the profile is loading', () => {
        localStorage.setItem('token', 'tok-123');
        vendorApi.getMe.mockImplementation(() => new Promise(() => {}));
        renderWithProviders(
            <VendorRoute><div>Vendor Dashboard Content</div></VendorRoute>
        );
        expect(screen.queryByText('Vendor Dashboard Content')).not.toBeInTheDocument();
        expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });
});

describe('ProductForm (create mode)', () => {
    const renderCreate = () =>
        renderWithProviders(<ProductForm mode="create" />, { route: '/vendor/products/new' });

    it('submits a valid product payload to productApi.create', async () => {
        const user = userEvent.setup();
        productApi.create.mockResolvedValue({ data: { id: 'new-1' } });
        renderCreate();

        await user.type(screen.getByPlaceholderText('Industrial Gloves'), 'Industrial Gloves');
        await user.type(screen.getByPlaceholderText('Safety Equipment'), 'Safety Equipment');
        await user.type(screen.getByPlaceholderText('500'), '500');

        await user.click(screen.getByRole('button', { name: /create product/i }));

        await waitFor(() => {
            expect(productApi.create).toHaveBeenCalledTimes(1);
        });
        const payload = productApi.create.mock.calls[0][0];
        expect(payload).toMatchObject({
            name: 'Industrial Gloves',
            category: 'Safety Equipment',
            price: 500,
            moq: 1,
            unit: 'unit',
            status: 'draft',
        });
    });

    it('blocks submission and shows inline errors when required fields are missing', async () => {
        const user = userEvent.setup();
        renderCreate();
        await user.click(screen.getByRole('button', { name: /create product/i }));

        await waitFor(() => {
            expect(screen.getByText('Name is required')).toBeInTheDocument();
        });
        expect(screen.getByText('Category is required')).toBeInTheDocument();
        expect(productApi.create).not.toHaveBeenCalled();
    });

    it('rejects a zero price', async () => {
        const user = userEvent.setup();
        renderCreate();
        await user.type(screen.getByPlaceholderText('Industrial Gloves'), 'Gloves');
        await user.type(screen.getByPlaceholderText('Safety Equipment'), 'Safety');
        await user.type(screen.getByPlaceholderText('500'), '0');
        await user.click(screen.getByRole('button', { name: /create product/i }));

        await waitFor(() => {
            expect(screen.getByText('Price must be > 0')).toBeInTheDocument();
        });
        expect(productApi.create).not.toHaveBeenCalled();
    });
});

describe('BulkSales tier pricing UI', () => {
    it('rejects overlapping tiers client-side and never calls the API', async () => {
        const user = userEvent.setup();
        bulkSaleApi.list.mockResolvedValue({ data: { items: [], total: 0 } });
        renderWithProviders(<BulkSales />, { route: '/vendor/bulk-sales' });

        // open the form
        await user.click(await screen.findByRole('button', { name: /new bulk sale/i }));

        // fill product + first tier 1-100 @100
        await user.selectOptions(screen.getByDisplayValue('Select a published product'), 'p1');
        const tierRows = () => screen.getAllByPlaceholderText('Min');
        await user.type(tierRows()[0], '1');
        await user.type(screen.getAllByPlaceholderText('∞')[0], '100');
        await user.type(screen.getAllByPlaceholderText('Price')[0], '100');

        // add a second overlapping tier 50-500 @90
        await user.click(screen.getByRole('button', { name: /add tier/i }));
        await user.type(tierRows()[1], '50');
        await user.type(screen.getAllByPlaceholderText('∞')[1], '500');
        await user.type(screen.getAllByPlaceholderText('Price')[1], '90');

        await user.click(screen.getByRole('button', { name: /create bulk sale/i }));

        await waitFor(() => {
            expect(screen.getByText(/Ranges cannot overlap/i)).toBeInTheDocument();
        });
        expect(bulkSaleApi.create).not.toHaveBeenCalled();
    });

    it('submits valid non-overlapping tiers to bulkSaleApi.create', async () => {
        const user = userEvent.setup();
        bulkSaleApi.list.mockResolvedValue({ data: { items: [], total: 0 } });
        bulkSaleApi.create.mockResolvedValue({ data: { id: 'bs-1' } });
        renderWithProviders(<BulkSales />, { route: '/vendor/bulk-sales' });

        await user.click(await screen.findByRole('button', { name: /new bulk sale/i }));
        await user.selectOptions(screen.getByDisplayValue('Select a published product'), 'p1');

        await user.type(screen.getAllByPlaceholderText('Min')[0], '1');
        await user.type(screen.getAllByPlaceholderText('∞')[0], '49');
        await user.type(screen.getAllByPlaceholderText('Price')[0], '500');

        await user.click(screen.getByRole('button', { name: /add tier/i }));
        await user.type(screen.getAllByPlaceholderText('Min')[1], '50');
        await user.type(screen.getAllByPlaceholderText('∞')[1], '199');
        await user.type(screen.getAllByPlaceholderText('Price')[1], '450');

        await user.click(screen.getByRole('button', { name: /create bulk sale/i }));

        await waitFor(() => {
            expect(bulkSaleApi.create).toHaveBeenCalledTimes(1);
        });
        const payload = bulkSaleApi.create.mock.calls[0][0];
        expect(payload.product_id).toBe('p1');
        expect(payload.tiers).toEqual([
            { min_quantity: 1, max_quantity: 49, unit_price: 500 },
            { min_quantity: 50, max_quantity: 199, unit_price: 450 },
        ]);
    });
});

describe('VendorOrders status updates', () => {
    const order = {
        id: 'o1',
        order_number: 'ORD-1',
        status: 'pending',
        total_amount: '119205.00',
        delivery_location: 'Mumbai',
        created_at: '2026-09-21T10:00:00Z',
        quotation: { items: [{ name: 'Industrial Gloves' }] },
    };

    it('offers only the valid next statuses (pending → confirm/cancel)', async () => {
        orderApi.listMine.mockResolvedValue({ data: { items: [order], total: 1 } });
        renderWithProviders(<VendorOrders />, { route: '/vendor/orders' });

        expect(await screen.findByText('ORD-1')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /mark confirmed/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /cancel order/i })).toBeInTheDocument();
        // no skip-ahead transitions
        expect(screen.queryByRole('button', { name: /mark shipped/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /mark completed/i })).not.toBeInTheDocument();
    });

    it('calls the status endpoint and reloads on click', async () => {
        const user = userEvent.setup();
        orderApi.listMine.mockResolvedValue({ data: { items: [order], total: 1 } });
        orderApi.updateStatus.mockResolvedValue({ data: { ...order, status: 'confirmed' } });
        renderWithProviders(<VendorOrders />, { route: '/vendor/orders' });

        await user.click(await screen.findByRole('button', { name: /mark confirmed/i }));

        await waitFor(() => {
            expect(orderApi.updateStatus).toHaveBeenCalledWith('o1', 'confirmed');
        });
        expect(orderApi.listMine).toHaveBeenCalledTimes(2); // initial + reload
    });

    it('shows an error toast when the backend rejects the transition', async () => {
        const user = userEvent.setup();
        orderApi.listMine.mockResolvedValue({ data: { items: [order], total: 1 } });
        orderApi.updateStatus.mockRejectedValue({ response: { data: { detail: 'Invalid status transition' } } });
        renderWithProviders(<VendorOrders />, { route: '/vendor/orders' });

        await user.click(await screen.findByRole('button', { name: /mark confirmed/i }));

        await waitFor(() => {
            expect(screen.getByText('Invalid status transition')).toBeInTheDocument();
        });
    });
});
