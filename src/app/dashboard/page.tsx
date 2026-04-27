'use client';

import React from 'react';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from '@hello-pangea/dnd';
import { Order, OrderStatus, ALL_STATUSES, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/lib/types';
import OrderModal from '@/components/OrderModal';
import OrderForm from '@/components/OrderForm';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import AccessDenied from '@/components/AccessDenied';

export default function DashboardPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  
  if (session?.user && (session.user as any).role !== 'admin' && !(session.user as any).permissions?.includes('/dashboard')) {
    return <main className="main-content"><AccessDenied /></main>;
  }

  const [orders, setOrders] = React.useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = React.useState<Order | null>(null);
  const [showForm, setShowForm] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  const fetchOrders = React.useCallback(async () => {
    try {
      const res = await fetch('/api/orders?filter=ongoing');

      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  React.useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setShowForm(true);
    }
  }, [searchParams]);

  const ordersByStatus = React.useMemo(() => {
    const map: Record<OrderStatus, Order[]> = {} as Record<OrderStatus, Order[]>;
    ALL_STATUSES.forEach(s => (map[s] = []));
    orders.forEach(o => {
      if (map[o.status]) map[o.status].push(o);
    });
    return map;
  }, [orders]);

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const newStatus = result.destination.droppableId as OrderStatus;
    const orderId = result.draggableId;

    let additionalUpdates: Partial<Order> = {};
    if (newStatus === 'production') {
      const currentOrder = orders.find(o => o.id === orderId);
      const prodNum = window.prompt(`Masukkan Production Number untuk order ${currentOrder?.nama}:`, currentOrder?.production_number || '');
      if (prodNum !== null) {
        additionalUpdates = { production_number: prodNum };
      }
    }

    // Optimistic update
    setOrders(prev =>
      prev.map(o =>
        o.id === orderId
          ? { ...o, status: newStatus, ...additionalUpdates, updated_at: new Date().toISOString() }
          : o
      )
    );

    try {
      await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, ...additionalUpdates }),
      });
    } catch {
      fetchOrders(); // revert on failure
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    setOrders(prev =>
      prev.map(o =>
        o.id === orderId
          ? { ...o, status: newStatus, updated_at: new Date().toISOString() }
          : o
      )
    );
    setSelectedOrder(prev =>
      prev && prev.id === orderId ? { ...prev, status: newStatus } : prev
    );

    await fetch(`/api/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
  };

  const handleSaveOrder = async (orderId: string, updates: Partial<Order>) => {
    const res = await fetch(`/api/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      const updated = await res.json();
      setOrders(prev => prev.map(o => (o.id === orderId ? updated : o)));
      setSelectedOrder(updated);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    await fetch(`/api/orders/${orderId}`, { method: 'DELETE' });
    setOrders(prev => prev.filter(o => o.id !== orderId));
    setSelectedOrder(null);
  };

  const handleNewOrder = async (data: Partial<Order>) => {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const newOrder = await res.json();
      setOrders(prev => [...prev, newOrder]);
      setShowForm(false);
    }
  };

  if (loading) {
    return (
      <main className="main-content">
        <div className="empty-state">
          <div className="empty-state-icon">⏳</div>
          <div className="empty-state-title">Loading orders...</div>
        </div>
      </main>
    );
  }

  return (
    <main className="main-content" style={{ padding: '24px 20px' }}>
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 className="page-title">Order Dashboard</h1>
          <p className="page-subtitle">{orders.length} total orders • Drag & drop untuk ubah status</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          ✚ Order Baru
        </button>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="kanban-wrapper">
          {ALL_STATUSES.map(status => {
            const isEmpty = ordersByStatus[status].length === 0;
            return (
            <div className="kanban-column" key={status} style={isEmpty ? { minWidth: '40px', width: '40px' } : {}}>
              <div className="kanban-column-header" style={isEmpty ? { justifyContent: 'center', padding: '16px 0' } : {}}>
                <div
                  className="kanban-column-dot"
                  style={{ background: ORDER_STATUS_COLORS[status], margin: isEmpty ? '0 auto' : undefined }}
                  title={ORDER_STATUS_LABELS[status]}
                />
                {!isEmpty && (
                  <>
                    <div className="kanban-column-title">
                      {ORDER_STATUS_LABELS[status]}
                    </div>
                    <div className="kanban-column-count">
                      {ordersByStatus[status].length}
                    </div>
                  </>
                )}
              </div>


              <Droppable droppableId={status}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`kanban-column-body ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
                    style={isEmpty ? { padding: '8px 4px' } : {}}
                  >
                    {!isEmpty && ordersByStatus[status].map((order, index) => (
                      <Draggable key={order.id} draggableId={order.id} index={index}>

                        {(dragProvided, dragSnapshot) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            {...dragProvided.dragHandleProps}
                            className={`order-card ${dragSnapshot.isDragging ? 'dragging' : ''}`}
                            onClick={() => setSelectedOrder(order)}
                          >
                            <div className="order-card-name">
                              {order.nama}
                              {order.nomor_plat && (
                                <span className="order-card-plate"> {order.nomor_plat}</span>
                              )}

                            </div>
                            <div className="order-card-size">{order.ukuran_plat || '—'}</div>
                            <div className="order-card-bundle">{order.jenis_bundling || '—'}</div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    {isEmpty && !snapshot.isDraggingOver && (
                      <div style={{
                        writingMode: 'vertical-rl',
                        textOrientation: 'mixed',
                        color: 'var(--text-muted)',
                        fontSize: 12,
                        margin: '10px auto',
                        letterSpacing: '1px',
                        textTransform: 'uppercase',
                        fontWeight: 600
                      }}>
                        {ORDER_STATUS_LABELS[status]}
                      </div>
                    )}

                  </div>
                )}
              </Droppable>
            </div>
          )})}

        </div>
      </DragDropContext>

      {selectedOrder && (
        <OrderModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onStatusChange={handleStatusChange}
          onSave={handleSaveOrder}
          onDelete={handleDeleteOrder}
        />
      )}

      {showForm && (
        <OrderForm
          onSubmit={handleNewOrder}
          onCancel={() => setShowForm(false)}
        />
      )}
    </main>
  );
}
