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
  const [isBatchMode, setIsBatchMode] = React.useState(false);
  const [batchSelectedIds, setBatchSelectedIds] = React.useState<Set<string>>(new Set());
  const [batchSaving, setBatchSaving] = React.useState(false);

  // Quick action menu state
  const [quickActionOrder, setQuickActionOrder] = React.useState<Order | null>(null);
  const [quickActionPos, setQuickActionPos] = React.useState({ x: 0, y: 0 });

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

  // ─── Quick action ───────────────────────────────────────────
  const openQuickAction = (e: React.MouseEvent, order: Order) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setQuickActionOrder(order);
    setQuickActionPos({ x: rect.right, y: rect.top });
  };

  const closeQuickAction = React.useCallback(() => {
    setQuickActionOrder(null);
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

  const handleBatchMove = async () => {
    const selectEl = document.getElementById('batchStatus') as HTMLSelectElement;
    if (!selectEl || !selectEl.value) {
      alert('Pilih status tujuan');
      return;
    }
    const newStatus = selectEl.value as OrderStatus;
    
    let additionalUpdates: Partial<Order> = {};
    if (newStatus === 'production') {
      const prodNum = window.prompt(`Masukkan Production Number untuk ${batchSelectedIds.size} order:`);
      if (prodNum !== null) additionalUpdates = { production_number: prodNum };
      else return; 
    }
    
    setBatchSaving(true);
    try {
      await fetch('/api/orders/batch', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ids: Array.from(batchSelectedIds), 
          updates: { status: newStatus, ...additionalUpdates } 
        }),
      });
      await fetchOrders(true);
      setBatchSelectedIds(new Set());
      setIsBatchMode(false);
    } catch (err) {
      console.error(err);
    } finally {
      setBatchSaving(false);
    }
  };

  // Also open on right-click for desktop
  const handleContextMenu = (e: React.MouseEvent, order: Order) => {
    e.preventDefault();
    setQuickActionOrder(order);
    setQuickActionPos({ x: e.clientX, y: e.clientY });
  };

  // Close on outside click
  React.useEffect(() => {
    if (!quickActionOrder) return;
    const close = () => closeQuickAction();
    const t = setTimeout(() => {
      window.addEventListener('pointerdown', close);
    }, 10);
    return () => {
      clearTimeout(t);
      window.removeEventListener('pointerdown', close);
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
            className={`btn ${isBatchMode ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => {
              setIsBatchMode(!isBatchMode);
              if (isBatchMode) setBatchSelectedIds(new Set());
            }}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {isBatchMode ? '❌ Cancel Batch' : '📦 Batch Move'}
          </button>
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
                              className={`order-card ${dragSnapshot.isDragging ? 'dragging' : ''} ${isBatchMode && batchSelectedIds.has(order.id) ? 'selected-batch' : ''}`}
                              onClick={() => {
                                if (isBatchMode) {
                                  setBatchSelectedIds(prev => {
                                    const next = new Set(prev);
                                    if (next.has(order.id)) next.delete(order.id);
                                    else next.add(order.id);
                                    return next;
                                  });
                                } else {
                                  setSelectedOrder(order);
                                }
                              }}
                              onContextMenu={(e) => handleContextMenu(e, order)}
                            >
                              {/* Card content */}
                              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 4 }}>
                                {isBatchMode && (
                                  <div style={{ marginRight: 8, display: 'flex', alignItems: 'center', marginTop: 2 }}>
                                    <div style={{ width: 16, height: 16, border: '2px solid var(--border)', borderRadius: 4, background: batchSelectedIds.has(order.id) ? 'var(--accent)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10 }}>
                                      {batchSelectedIds.has(order.id) && '✓'}
                                    </div>
                                  </div>
                                )}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div className="order-card-name">
                                    {order.nama}
                                    {order.nomor_plat && (
                                      <span className="order-card-plate"> {order.nomor_plat}</span>
                                    )}
                                  </div>
                                  <div className="order-card-size">
                                    {order.ukuran_plat === 'Mix Size' 
                                      ? `Mix Size (${order.mix_size_1 || '?'} & ${order.mix_size_2 || '?'})` 
                                      : order.ukuran_plat || '—'}
                                  </div>
                                  <div className="order-card-bundle">{order.jenis_bundling || '—'}</div>
                                </div>

                                {/* >> Move button */}
                                <button
                                  className="card-move-btn"
                                  title="Move to..."
                                  onClick={(e) => openQuickAction(e, order)}
                                  onPointerDown={(e) => e.stopPropagation()}
                                >
                                  ››
                                </button>
                              </div>
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

      {/* Floating Action Bar for Batch Mode */}
      {isBatchMode && batchSelectedIds.size > 0 && (
        <div style={{
          position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--bg-card)', padding: '16px 24px', borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--accent)', boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
          display: 'flex', gap: 16, alignItems: 'center', zIndex: 1000
        }}>
          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
            {batchSelectedIds.size} terpilih
          </div>
          <select id="batchStatus" className="input-premium" style={{ width: 200, padding: '8px 12px' }} defaultValue="">
            <option value="" disabled>Pindah ke...</option>
            {ALL_STATUSES.map(s => (
              <option key={s} value={s}>{ORDER_STATUS_LABELS[s]}</option>
            ))}
          </select>
          <button className="btn btn-primary" onClick={handleBatchMove} disabled={batchSaving}>
            {batchSaving ? '⏳ Menyimpan...' : '✅ Confirm'}
          </button>
        </div>
      )}

      {/* Quick Action Popup */}
      {quickActionOrder && (
        <div
          className="quick-action-overlay"
          onPointerDown={(e) => { e.stopPropagation(); closeQuickAction(); }}
        >
          <div
            className="quick-action-menu"
            style={{
              top: Math.min(quickActionPos.y, window.innerHeight - 440),
              left: Math.min(quickActionPos.x + 4, window.innerWidth - 224),
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="quick-action-header">
              <div className="quick-action-title">›› Move to</div>
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
