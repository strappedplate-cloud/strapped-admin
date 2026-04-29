'use client';

import React, { Suspense } from 'react';
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

function DashboardContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  
  if (session?.user && (session.user as any).role !== 'admin' && !(session.user as any).permissions?.includes('/dashboard')) {
    return <main className="main-content"><AccessDenied /></main>;
  }

  const [orders, setOrders] = React.useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = React.useState<Order | null>(null);
  const [showForm, setShowForm] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  // Quick action menu state
  const [quickActionOrder, setQuickActionOrder] = React.useState<Order | null>(null);
  const [quickActionPos, setQuickActionPos] = React.useState({ x: 0, y: 0 });
  const longPressTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = React.useRef(false);

  // Swipe-to-scroll: rely on native overflow-x: auto (CSS handles touch scrolling)
  const kanbanRef = React.useRef<HTMLDivElement>(null);

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

  // Quick action: move to category
  const handleQuickMove = async (order: Order, newStatus: OrderStatus) => {
    setQuickActionOrder(null);

    let additionalUpdates: Partial<Order> = {};
    if (newStatus === 'production') {
      const prodNum = window.prompt(`Masukkan Production Number untuk order ${order.nama}:`, order.production_number || '');
      if (prodNum !== null) {
        additionalUpdates = { production_number: prodNum };
      }
    }

    setOrders(prev =>
      prev.map(o =>
        o.id === order.id
          ? { ...o, status: newStatus, ...additionalUpdates, updated_at: new Date().toISOString() }
          : o
      )
    );

    try {
      await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, ...additionalUpdates }),
      });
    } catch {
      fetchOrders();
    }
  };

  // Long press handlers
  const handleTouchStart = (e: React.TouchEvent, order: Order) => {
    longPressTriggered.current = false;
    const touch = e.touches[0];
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      setQuickActionOrder(order);
      setQuickActionPos({ x: touch.clientX, y: touch.clientY });
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleTouchMove = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };



  // Close quick action on outside click
  React.useEffect(() => {
    if (!quickActionOrder) return;
    const close = () => setQuickActionOrder(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [quickActionOrder]);

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
        <div
          className="kanban-wrapper"
          ref={kanbanRef}
        >
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
                            onClick={() => {
                              if (!longPressTriggered.current) {
                                setSelectedOrder(order);
                              }
                            }}
                            onTouchStart={(e) => handleTouchStart(e, order)}
                            onTouchEnd={handleTouchEnd}
                            onTouchMove={handleTouchMove}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              setQuickActionOrder(order);
                              setQuickActionPos({ x: e.clientX, y: e.clientY });
                            }}
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

      {/* Quick Action Context Menu */}
      {quickActionOrder && (
        <div
          className="quick-action-overlay"
          onClick={() => setQuickActionOrder(null)}
          onTouchEnd={() => setQuickActionOrder(null)}
        >
          <div
            className="quick-action-menu"
            style={{
              top: Math.min(quickActionPos.y, window.innerHeight - 400),
              left: Math.min(quickActionPos.x, window.innerWidth - 220),
            }}
            onClick={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            <div className="quick-action-header">
              <div className="quick-action-title">📋 Move to</div>
              <div className="quick-action-subtitle">{quickActionOrder.nama}</div>
            </div>
            <div className="quick-action-list">
              {ALL_STATUSES.filter(s => s !== quickActionOrder.status).map(status => (
                <button
                  key={status}
                  className="quick-action-item"
                  onClick={() => handleQuickMove(quickActionOrder, status)}
                  onTouchEnd={(e) => {
                    e.stopPropagation();
                    handleQuickMove(quickActionOrder, status);
                  }}
                >
                  <span
                    className="quick-action-dot"
                    style={{ background: ORDER_STATUS_COLORS[status] }}
                  />
                  {ORDER_STATUS_LABELS[status]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

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

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <main className="main-content">
        <div className="empty-state">
          <div className="empty-state-icon">⏳</div>
          <div className="empty-state-title">Loading dashboard...</div>
        </div>
      </main>
    }>
      <DashboardContent />
    </Suspense>
  );
}
