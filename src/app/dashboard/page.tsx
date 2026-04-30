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
  const [refreshing, setRefreshing] = React.useState(false);

  // Quick action menu state
  const [quickActionOrder, setQuickActionOrder] = React.useState<Order | null>(null);
  const [quickActionPos, setQuickActionPos] = React.useState({ x: 0, y: 0 });

  // Long press refs
  const longPressTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = React.useRef(false);

  // Mouse-drag scroll refs (desktop)
  const kanbanRef = React.useRef<HTMLDivElement>(null);
  const isDraggingKanban = React.useRef(false);
  const dragStartX = React.useRef(0);
  const dragScrollLeft = React.useRef(0);

  // ─── Data fetching ─────────────────────────────────────────
  const fetchOrders = React.useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    try {
      const res = await fetch('/api/orders?filter=ongoing');
      if (res.ok) setOrders(await res.json());
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => { fetchOrders(); }, [fetchOrders]);

  React.useEffect(() => {
    if (searchParams.get('new') === 'true') setShowForm(true);
  }, [searchParams]);

  const ordersByStatus = React.useMemo(() => {
    const map: Record<OrderStatus, Order[]> = {} as Record<OrderStatus, Order[]>;
    ALL_STATUSES.forEach(s => (map[s] = []));
    orders.forEach(o => { if (map[o.status]) map[o.status].push(o); });
    return map;
  }, [orders]);

  // ─── Order actions ──────────────────────────────────────────
  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const newStatus = result.destination.droppableId as OrderStatus;
    const orderId = result.draggableId;

    let additionalUpdates: Partial<Order> = {};
    if (newStatus === 'production') {
      const currentOrder = orders.find(o => o.id === orderId);
      const prodNum = window.prompt(`Masukkan Production Number untuk order ${currentOrder?.nama}:`, currentOrder?.production_number || '');
      if (prodNum !== null) additionalUpdates = { production_number: prodNum };
    }

    setOrders(prev =>
      prev.map(o => o.id === orderId ? { ...o, status: newStatus, ...additionalUpdates, updated_at: new Date().toISOString() } : o)
    );

    try {
      await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, ...additionalUpdates }),
      });
    } catch {
      fetchOrders();
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    setOrders(prev =>
      prev.map(o => o.id === orderId ? { ...o, status: newStatus, updated_at: new Date().toISOString() } : o)
    );
    setSelectedOrder(prev => prev && prev.id === orderId ? { ...prev, status: newStatus } : prev);
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

  // ─── Quick action (hold press) ──────────────────────────────
  const closeQuickAction = React.useCallback(() => {
    setQuickActionOrder(null);
    // Reset flag a tick later so the click that closes the menu
    // doesn't also open the order modal
    setTimeout(() => { longPressTriggered.current = false; }, 100);
  }, []);

  const handleQuickMove = async (order: Order, newStatus: OrderStatus) => {
    closeQuickAction();

    let additionalUpdates: Partial<Order> = {};
    if (newStatus === 'production') {
      const prodNum = window.prompt(`Masukkan Production Number untuk order ${order.nama}:`, order.production_number || '');
      if (prodNum !== null) additionalUpdates = { production_number: prodNum };
    }

    setOrders(prev =>
      prev.map(o => o.id === order.id ? { ...o, status: newStatus, ...additionalUpdates, updated_at: new Date().toISOString() } : o)
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

  // ─── Long press (touch) ─────────────────────────────────────
  const handleCardTouchStart = (e: React.TouchEvent, order: Order) => {
    longPressTriggered.current = false;
    const touch = e.touches[0];
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      setQuickActionOrder(order);
      setQuickActionPos({ x: touch.clientX, y: touch.clientY });
    }, 500);
  };

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  // ─── Mouse-drag scroll (desktop) ───────────────────────────
  const handleKanbanMouseDown = (e: React.MouseEvent) => {
    if (!kanbanRef.current) return;
    // Only drag on the wrapper itself (not on cards)
    if ((e.target as HTMLElement).closest('.order-card')) return;
    isDraggingKanban.current = true;
    dragStartX.current = e.pageX - kanbanRef.current.offsetLeft;
    dragScrollLeft.current = kanbanRef.current.scrollLeft;
    kanbanRef.current.style.cursor = 'grabbing';
    kanbanRef.current.style.userSelect = 'none';
  };

  React.useEffect(() => {
    const el = kanbanRef.current;
    if (!el) return;

    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingKanban.current) return;
      const x = e.pageX - el.offsetLeft;
      const walk = (x - dragStartX.current) * 1.2;
      el.scrollLeft = dragScrollLeft.current - walk;
    };

    const onMouseUp = () => {
      if (!isDraggingKanban.current) return;
      isDraggingKanban.current = false;
      el.style.cursor = 'grab';
      el.style.userSelect = '';
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  // ─── Close quick action on outside click ───────────────────
  React.useEffect(() => {
    if (!quickActionOrder) return;
    const close = (e: MouseEvent | TouchEvent) => {
      closeQuickAction();
    };
    // delay to avoid same-event closing immediately
    const t = setTimeout(() => {
      window.addEventListener('click', close);
      window.addEventListener('touchend', close);
    }, 10);
    return () => {
      clearTimeout(t);
      window.removeEventListener('click', close);
      window.removeEventListener('touchend', close);
    };
  }, [quickActionOrder, closeQuickAction]);

  // ─── Render ─────────────────────────────────────────────────
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
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn btn-secondary"
            onClick={() => fetchOrders(true)}
            disabled={refreshing}
            title="Refresh orders"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <span style={{ display: 'inline-block', transition: 'transform 0.6s', transform: refreshing ? 'rotate(360deg)' : 'none' }}>🔄</span>
            <span className="hide-mobile">Refresh</span>
          </button>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            ✚ <span className="hide-mobile">Order Baru</span>
          </button>
        </div>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div
          className="kanban-wrapper"
          ref={kanbanRef}
          onMouseDown={handleKanbanMouseDown}
          style={{ cursor: 'grab' }}
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
                      <div className="kanban-column-title">{ORDER_STATUS_LABELS[status]}</div>
                      <div className="kanban-column-count">{ordersByStatus[status].length}</div>
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
                              onTouchStart={(e) => handleCardTouchStart(e, order)}
                              onTouchEnd={cancelLongPress}
                              onTouchMove={cancelLongPress}
                              onContextMenu={(e) => {
                                e.preventDefault();
                                longPressTriggered.current = true;
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
                          fontWeight: 600,
                        }}>
                          {ORDER_STATUS_LABELS[status]}
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      {/* Quick Action Context Menu */}
      {quickActionOrder && (
        <div
          className="quick-action-overlay"
          onClick={(e) => { e.stopPropagation(); closeQuickAction(); }}
          onTouchEnd={(e) => { e.stopPropagation(); closeQuickAction(); }}
        >
          <div
            className="quick-action-menu"
            style={{
              top: Math.min(quickActionPos.y, window.innerHeight - 420),
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
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    handleQuickMove(quickActionOrder, status);
                  }}
                >
                  <span className="quick-action-dot" style={{ background: ORDER_STATUS_COLORS[status] }} />
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
