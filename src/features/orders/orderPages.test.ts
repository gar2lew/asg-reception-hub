import { createElement } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  session: { staffId: 'reception-1', name: 'Reception', role: 'reception', location: 'brisbane', loginAt: '' },
  orders: [] as any[],
  lines: [] as any[],
  loadOrders: vi.fn(),
  loadOrderLines: vi.fn(),
  loadOrderReferenceData: vi.fn(),
  loadInventory: vi.fn(),
  createOrderDraft: vi.fn(),
  submitOrder: vi.fn(),
  approveOrder: vi.fn(),
  rejectOrder: vi.fn(),
  markOrderOrdered: vi.fn(),
  cancelOrder: vi.fn(),
  receiveOrder: vi.fn(),
}));

vi.mock('../../services/authService', () => ({
  getSession: () => mocks.session,
  isAdmin: () => mocks.session.role === 'admin',
  isAuthenticated: () => true,
  logout: vi.fn(),
}));
vi.mock('../../services/stockOrderReads', () => ({
  loadOrders: mocks.loadOrders,
  loadOrderLines: mocks.loadOrderLines,
  loadOrderReferenceData: mocks.loadOrderReferenceData,
  loadInventory: mocks.loadInventory,
}));
vi.mock('../../services/stockOrderActions', () => ({
  createOrderDraft: mocks.createOrderDraft,
  submitOrder: mocks.submitOrder,
  approveOrder: mocks.approveOrder,
  rejectOrder: mocks.rejectOrder,
  markOrderOrdered: mocks.markOrderOrdered,
  cancelOrder: mocks.cancelOrder,
  receiveOrder: mocks.receiveOrder,
}));

const item = {
  id: 'paper', itemName: 'Copy paper', unitLabel: 'ream', active: true,
  createdAt: '2026-08-01T00:00:00.000Z', updatedAt: '2026-08-01T00:00:00.000Z',
};

describe('order pages', () => {
  beforeAll(() => {
    HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) { this.open = true; });
    HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) { this.open = false; });
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.session = { staffId: 'reception-1', name: 'Reception', role: 'reception', location: 'brisbane', loginAt: '' };
    mocks.orders = [];
    mocks.lines = [];
    mocks.loadOrders.mockImplementation(async () => mocks.orders);
    mocks.loadOrderLines.mockImplementation(async () => mocks.lines);
    mocks.loadOrderReferenceData.mockResolvedValue({ items: [item], suppliers: [] });
    mocks.loadInventory.mockResolvedValue([]);
    mocks.createOrderDraft.mockResolvedValue({ id: 'order-new', status: 'draft' });
    for (const action of [mocks.submitOrder, mocks.approveOrder, mocks.rejectOrder, mocks.markOrderOrdered, mocks.cancelOrder, mocks.receiveOrder]) {
      action.mockResolvedValue({ success: true });
    }
  });

  it('creates and submits a requester order through the async action boundary', async () => {
    const { OrdersPage } = await import('./OrdersPage');
    render(createElement(OrdersPage));
    await screen.findByRole('button', { name: /new order/i });

    fireEvent.click(screen.getByRole('button', { name: /new order/i }));
    fireEvent.change(screen.getByLabelText('Add Item'), { target: { value: 'paper' } });
    fireEvent.change(screen.getByLabelText('Qty'), { target: { value: '4' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    fireEvent.click(screen.getByRole('button', { name: /submit order/i }));

    await waitFor(() => expect(mocks.submitOrder).toHaveBeenCalledWith(expect.objectContaining({
      orderId: 'order-new', requestedBy: 'reception-1',
      lines: [{ stockItemId: 'paper', itemName: 'Copy paper', unitLabel: 'ream', quantityRequested: 4 }],
    })));
    expect(mocks.createOrderDraft).toHaveBeenCalledWith(expect.objectContaining({ office: 'brisbane', requestedBy: 'reception-1' }));
    expect(mocks.loadOrders).toHaveBeenCalledWith({ role: 'reception', location: 'brisbane' });
  });

  it('cancels and refreshes a newly created draft when submission fails', async () => {
    mocks.submitOrder.mockRejectedValueOnce(new Error('Submit unavailable'));
    const { OrdersPage } = await import('./OrdersPage');
    render(createElement(OrdersPage));
    await screen.findByRole('button', { name: /new order/i });

    fireEvent.click(screen.getByRole('button', { name: /new order/i }));
    fireEvent.change(screen.getByLabelText('Add Item'), { target: { value: 'paper' } });
    fireEvent.change(screen.getByLabelText('Qty'), { target: { value: '4' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    fireEvent.click(screen.getByRole('button', { name: /submit order/i }));

    await waitFor(() => expect(mocks.cancelOrder).toHaveBeenCalledWith({
      orderId: 'order-new',
      reason: 'Automatic cleanup after submit failure',
    }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Submit unavailable');
    expect(mocks.loadOrders).toHaveBeenCalledTimes(2);
  });

  it('opens the admin orders query tab and approves a loaded order', async () => {
    mocks.session = { staffId: 'admin-1', name: 'Administrator', role: 'admin', location: 'all', loginAt: '' };
    mocks.orders = [{
      id: 'order-1', office: 'brisbane', requestedBy: 'reception-1', status: 'requested',
      requestedAt: '2026-08-01T00:00:00.000Z', createdAt: '2026-08-01T00:00:00.000Z', updatedAt: '2026-08-01T00:00:00.000Z',
    }];
    mocks.lines = [{
      id: 'line-1', orderId: 'order-1', stockItemId: 'paper', itemName: 'Copy paper', unitLabel: 'ream',
      quantityRequested: 4, quantityReceived: 0, createdAt: '2026-08-01T00:00:00.000Z',
    }];
    const { AdminPage } = await import('../admin/AdminPage');
    render(createElement(MemoryRouter, { initialEntries: ['/admin?tab=orders'] }, createElement(AdminPage)));

    await screen.findByText('Stock Orders (1)');
    fireEvent.click(screen.getByRole('button', { name: 'Approve order order-1' }));
    fireEvent.change(screen.getByLabelText('Approval reason'), { target: { value: 'Within budget' } });
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));

    await waitFor(() => expect(mocks.approveOrder).toHaveBeenCalledWith({
      orderId: 'order-1', reason: 'Within budget',
      lineApprovals: [{ stockItemId: 'paper', quantityApproved: 4 }],
      localActor: { uid: 'admin-1', name: 'Administrator', role: 'admin' },
    }));
  });

  it('sends the expected delivery date when an administrator marks an order ordered', async () => {
    mocks.session = { staffId: 'admin-1', name: 'Administrator', role: 'admin', location: 'all', loginAt: '' };
    mocks.orders = [{
      id: 'order-2', office: 'brisbane', requestedBy: 'reception-1', status: 'approved',
      requestedAt: '2026-08-01T00:00:00.000Z', createdAt: '2026-08-01T00:00:00.000Z', updatedAt: '2026-08-01T00:00:00.000Z',
    }];
    const { AdminPage } = await import('../admin/AdminPage');
    render(createElement(MemoryRouter, { initialEntries: ['/admin?tab=orders'] }, createElement(AdminPage)));

    await screen.findByText('Stock Orders (1)');
    fireEvent.click(screen.getByRole('button', { name: 'Mark order order-2 ordered' }));
    fireEvent.change(screen.getByLabelText('Supplier reference'), { target: { value: 'SUP-42' } });
    fireEvent.change(screen.getByLabelText('Expected delivery date'), { target: { value: '2026-08-20' } });
    fireEvent.click(screen.getByRole('button', { name: 'Mark Ordered' }));

    await waitFor(() => expect(mocks.markOrderOrdered).toHaveBeenCalledWith({
      orderId: 'order-2', supplierReference: 'SUP-42', expectedDeliveryDate: '2026-08-20',
      localActor: { uid: 'admin-1', name: 'Administrator', role: 'admin' },
    }));
  });
});
