import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getAdminOrders, confirmOrder, completeOrder, rejectOrder, reprintVenueOrder, getOrderStats,
  getFloorPlan, updateFloorTables, updateFloorZones, addFloorTable, deleteFloorTable, updateTableParty,
  getMenuItems, createMenuItem, updateMenuItem, deleteMenuItem, uploadMenuPhoto, deleteMenuPhoto,
  getToggles, createToggle, updateToggle, deleteToggle,
  getLoyaltyMembers, getLoyaltyMember, redeemReward,
  getCRMStats, staffSearch, staffRedeem,
} from '../services/api.js';

const API_BASE = import.meta.env.VITE_API_URL || '';

const T = {
  bg: '#1a1210', card: '#2a1f1a', accent: '#d4a843', accentDark: '#b8922e',
  text: '#f5f0e8', textDim: '#a89880', border: '#3d2e22',
  green: '#4caf50', red: '#ef5350', blue: '#42a5f5', orange: '#ff9800',
};

// ── Notification chime ──
function playChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = 880; osc.type = 'sine';
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.5);
  } catch(e) {}
}

// ── PIN Gate ──
function PinGate({ onAuth }) {
  const [pin, setPin] = useState('');
  const [err, setErr] = useState('');
  return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: T.card, padding: 40, borderRadius: 16, textAlign: 'center', minWidth: 300 }}>
        <h2 style={{ color: T.accent, margin: '0 0 8px' }}>Thai House Dashboard</h2>
        <p style={{ color: T.textDim, margin: '0 0 24px', fontSize: 14 }}>Enter staff PIN</p>
        <input type="password" value={pin} onChange={e => setPin(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onAuth(pin, setErr)}
          style={{ width: '100%', padding: 12, fontSize: 20, textAlign: 'center', background: T.bg,
            color: T.text, border: `1px solid ${T.border}`, borderRadius: 8, outline: 'none',
            boxSizing: 'border-box' }}
          placeholder="****" autoFocus />
        {err && <p style={{ color: T.red, margin: '8px 0 0', fontSize: 13 }}>{err}</p>}
        <button onClick={() => onAuth(pin, setErr)}
          style={{ marginTop: 16, width: '100%', padding: 12, background: T.accent, color: '#000',
            border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 16, cursor: 'pointer' }}>
          Enter
        </button>
      </div>
    </div>
  );
}

// ── Tab Button ──
function TabBtn({ label, active, onClick, badge }) {
  return (
    <button onClick={onClick} style={{
      padding: '10px 20px', background: active ? T.accent : 'transparent',
      color: active ? '#000' : T.textDim, border: 'none', borderBottom: active ? `3px solid ${T.accent}` : '3px solid transparent',
      fontWeight: active ? 700 : 500, fontSize: 14, cursor: 'pointer', position: 'relative',
      transition: 'all 0.2s',
    }}>
      {label}
      {badge > 0 && <span style={{ position: 'absolute', top: 2, right: 2,
        background: T.red, color: '#fff', borderRadius: '50%', width: 18, height: 18,
        fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700
      }}>{badge}</span>}
    </button>
  );
}

// ── Stat Card ──
function Stat({ label, value, color }) {
  return (
    <div style={{ background: T.card, padding: '16px 20px', borderRadius: 10, minWidth: 120, flex: 1 }}>
      <div style={{ color: T.textDim, fontSize: 12, marginBottom: 4 }}>{label}</div>
      <div style={{ color: color || T.text, fontSize: 24, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// ORDERS TAB
// ════════════════════════════════════════════════════════
function OrdersTab({ pin }) {
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({});
  const prevCountRef = useRef(0);

  const load = useCallback(() => {
    getAdminOrders(pin).then(d => {
      if (d.orders.length > prevCountRef.current && prevCountRef.current > 0) {
        const newNew = d.orders.filter(o => o.order_status === 'new').length;
        if (newNew > 0) playChime();
      }
      prevCountRef.current = d.orders.length;
      setOrders(d.orders);
    }).catch(() => {});
    getOrderStats(pin).then(setStats).catch(() => {});
  }, [pin]);

  useEffect(() => { load(); const iv = setInterval(load, 5000); return () => clearInterval(iv); }, [load]);

  const newOrders = orders.filter(o => o.order_status === 'new');
  const confirmed = orders.filter(o => o.order_status === 'confirmed');
  const completed = orders.filter(o => o.order_status === 'completed').slice(0, 10);

  const handleConfirm = (id) => confirmOrder(pin, id).then(load);
  const handleComplete = (id) => completeOrder(pin, id).then(load);
  const handleReject = (id) => {
    const reason = prompt('Reason for rejection (optional):');
    rejectOrder(pin, id, reason || '').then(load);
  };
  const handleReprint = (id) => reprintVenueOrder(pin, id).then(load);

  function OrderCard({ order, actions }) {
    const items = order.items || [];
    return (
      <div style={{ background: T.bg, borderRadius: 10, padding: 14, marginBottom: 10,
        border: `1px solid ${T.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ color: T.accent, fontWeight: 700, fontSize: 16 }}>#{order.order_number}</span>
          <span style={{ color: T.textDim, fontSize: 12 }}>
            {order.created_at ? new Date(order.created_at + 'Z').toLocaleTimeString() : ''}
          </span>
        </div>
        <div style={{ color: T.text, fontWeight: 600, marginBottom: 4 }}>{order.customer_name}</div>
        {order.table_number && <div style={{ color: T.blue, fontSize: 13, marginBottom: 4 }}>Table {order.table_number}</div>}
        {items.map((it, i) => (
          <div key={i} style={{ color: T.textDim, fontSize: 13, marginBottom: 2 }}>
            {it.quantity}x {it.name} — ${(it.price * it.quantity).toFixed(2)}
            {it.customizations && Object.entries(it.customizations).map(([k,v]) => (
              <span key={k} style={{ color: T.orange, marginLeft: 6, fontSize: 11 }}>{v}</span>
            ))}
            {it.notes && <div style={{ color: T.orange, fontSize: 11, marginLeft: 12 }}>{it.notes}</div>}
          </div>
        ))}
        <div style={{ color: T.accent, fontWeight: 700, marginTop: 6, fontSize: 15 }}>
          ${order.total?.toFixed(2)}
        </div>
        {actions && <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>{actions}</div>}
      </div>
    );
  }

  const btnStyle = (bg) => ({
    padding: '8px 16px', background: bg, color: '#fff', border: 'none',
    borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13, flex: 1,
  });

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <Stat label="New Orders" value={stats.new_orders || 0} color={T.red} />
        <Stat label="In Progress" value={stats.confirmed_orders || 0} color={T.orange} />
        <Stat label="Today's Revenue" value={`$${(stats.today_revenue || 0).toFixed(2)}`} color={T.green} />
        <Stat label="Today's Orders" value={stats.today_count || 0} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        <div>
          <h3 style={{ color: T.red, margin: '0 0 12px' }}>New ({newOrders.length})</h3>
          {newOrders.map(o => (
            <OrderCard key={o.id} order={o} actions={<>
              <button style={btnStyle(T.green)} onClick={() => handleConfirm(o.id)}>Confirm</button>
              <button style={btnStyle(T.red)} onClick={() => handleReject(o.id)}>Reject</button>
            </>} />
          ))}
          {!newOrders.length && <p style={{ color: T.textDim, fontSize: 13 }}>No new orders</p>}
        </div>
        <div>
          <h3 style={{ color: T.orange, margin: '0 0 12px' }}>In Progress ({confirmed.length})</h3>
          {confirmed.map(o => (
            <OrderCard key={o.id} order={o} actions={<>
              <button style={btnStyle(T.green)} onClick={() => handleComplete(o.id)}>Complete</button>
              <button style={{ ...btnStyle(T.border), color: T.textDim }} onClick={() => handleReprint(o.id)}>Reprint</button>
            </>} />
          ))}
          {!confirmed.length && <p style={{ color: T.textDim, fontSize: 13 }}>None in progress</p>}
        </div>
        <div>
          <h3 style={{ color: T.green, margin: '0 0 12px' }}>Completed (recent)</h3>
          {completed.map(o => <OrderCard key={o.id} order={o} />)}
          {!completed.length && <p style={{ color: T.textDim, fontSize: 13 }}>No completed orders yet</p>}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// TABLES TAB
// ════════════════════════════════════════════════════════
function TablesTab({ pin }) {
  const [tables, setTables] = useState([]);
  const [zones, setZones] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [dragging, setDragging] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);

  const load = useCallback(() => {
    getFloorPlan(pin).then(d => {
      setTables(d.tables || []);
      setZones(d.zones || []);
    }).catch(() => {});
  }, [pin]);

  useEffect(() => { load(); }, [load]);

  const handleSave = () => {
    Promise.all([
      updateFloorTables(pin, tables),
      updateFloorZones(pin, zones),
    ]).then(() => { setEditMode(false); load(); });
  };

  const handleAddTable = () => {
    const num = tables.length > 0 ? Math.max(...tables.map(t => t.num)) + 1 : 1;
    setTables([...tables, { num, x: 100, y: 100, w: 90, h: 50, type: 'table', seats: 4, label: 'Table', zone: '' }]);
  };

  const handleDeleteTable = (idx) => {
    setTables(tables.filter((_, i) => i !== idx));
  };

  const handleAddZone = () => {
    const label = prompt('Zone label:');
    if (!label) return;
    setZones([...zones, { label, x: 50, y: 50, w: 200, h: 150, color: '#2a3025', is_entrance: false }]);
  };

  const handleMouseDown = (e, idx) => {
    if (!editMode) return;
    const rect = containerRef.current.getBoundingClientRect();
    setDragging(idx);
    setDragOffset({ x: e.clientX - rect.left - tables[idx].x, y: e.clientY - rect.top - tables[idx].y });
  };

  const handleMouseMove = (e) => {
    if (dragging === null || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left - dragOffset.x, rect.width - 90));
    const y = Math.max(0, Math.min(e.clientY - rect.top - dragOffset.y, rect.height - 50));
    setTables(prev => prev.map((t, i) => i === dragging ? { ...t, x, y } : t));
  };

  const handleMouseUp = () => setDragging(null);

  const totalSeats = tables.reduce((s, t) => s + (t.seats || 4), 0);

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
        <Stat label="Tables" value={tables.length} />
        <Stat label="Total Seats" value={totalSeats} />
        <div style={{ flex: 1 }} />
        {editMode ? <>
          <button onClick={handleAddTable} style={{ padding: '8px 16px', background: T.blue, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>+ Table</button>
          <button onClick={handleAddZone} style={{ padding: '8px 16px', background: T.orange, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>+ Zone</button>
          <button onClick={handleSave} style={{ padding: '8px 16px', background: T.green, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 700 }}>Save</button>
          <button onClick={() => { setEditMode(false); load(); }} style={{ padding: '8px 16px', background: T.border, color: T.textDim, border: 'none', borderRadius: 6, cursor: 'pointer' }}>Cancel</button>
        </> : <button onClick={() => setEditMode(true)} style={{ padding: '8px 16px', background: T.accent, color: '#000', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 700 }}>Edit Mode</button>}
      </div>
      <div ref={containerRef}
        onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
        style={{ position: 'relative', width: '100%', height: 500, background: T.card,
          borderRadius: 12, border: `1px solid ${T.border}`, overflow: 'hidden' }}>
        {zones.map((z, i) => (
          <div key={`z-${i}`} style={{
            position: 'absolute', left: z.x, top: z.y, width: z.w, height: z.h,
            background: z.is_entrance ? 'rgba(76,175,80,0.15)' : (z.color + '30'),
            border: `1px dashed ${z.is_entrance ? T.green : T.border}`, borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: T.textDim, fontSize: 13, fontWeight: 600,
          }}>
            {z.is_entrance ? 'Entrance' : z.label}
            {editMode && <button onClick={() => setZones(zones.filter((_, j) => j !== i))}
              style={{ position: 'absolute', top: 2, right: 2, background: T.red, color: '#fff',
                border: 'none', borderRadius: '50%', width: 18, height: 18, fontSize: 11,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>x</button>}
          </div>
        ))}
        {tables.map((t, i) => (
          <div key={`t-${i}`}
            onMouseDown={(e) => handleMouseDown(e, i)}
            onDoubleClick={() => {
              if (!editMode) return;
              const seats = prompt('Party size / seats:', t.seats);
              if (seats) setTables(prev => prev.map((tb, j) => j === i ? { ...tb, seats: parseInt(seats) || 4 } : tb));
            }}
            style={{
              position: 'absolute', left: t.x, top: t.y, width: t.w || 90, height: t.h || 50,
              background: T.accent + '20', border: `2px solid ${T.accent}`, borderRadius: 8,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              cursor: editMode ? 'move' : 'default', userSelect: 'none',
            }}>
            <span style={{ color: T.accent, fontWeight: 700, fontSize: 14 }}>{t.num}</span>
            <span style={{ color: T.textDim, fontSize: 10 }}>{t.seats} seats</span>
            {editMode && <button onClick={(e) => { e.stopPropagation(); handleDeleteTable(i); }}
              style={{ position: 'absolute', top: -8, right: -8, background: T.red, color: '#fff',
                border: 'none', borderRadius: '50%', width: 18, height: 18, fontSize: 11,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>x</button>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// MENU TAB
// ════════════════════════════════════════════════════════
function MenuTab({ pin }) {
  const [categories, setCategories] = useState([]);
  const [togglesList, setTogglesList] = useState([]);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');

  const load = useCallback(() => {
    getMenuItems(pin).then(d => {
      setCategories(d.categories || []);
      setTogglesList(d.toggles || []);
    }).catch(() => {});
  }, [pin]);

  useEffect(() => { load(); }, [load]);

  const filtered = categories.map(cat => ({
    ...cat,
    items: cat.items.filter(it =>
      it.name.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter(cat => cat.items.length > 0);

  const totalItems = categories.reduce((s, c) => s + c.items.length, 0);
  const withPhotos = categories.reduce((s, c) => s + c.items.filter(i => i.has_photo).length, 0);

  const handleSave = (slug, data) => {
    updateMenuItem(slug, data, pin).then(() => { setEditing(null); load(); });
  };

  const handleDelete = (slug) => {
    if (!confirm('Delete this item?')) return;
    deleteMenuItem(slug, pin).then(load);
  };

  const handlePhotoUpload = (slug) => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*';
    input.onchange = (e) => {
      if (e.target.files[0]) uploadMenuPhoto(slug, e.target.files[0], pin).then(load);
    };
    input.click();
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <Stat label="Total Items" value={totalItems} />
        <Stat label="With Photos" value={withPhotos} color={T.green} />
        <Stat label="Categories" value={categories.length} />
        <Stat label="Toggles" value={togglesList.length} />
      </div>
      <input value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Search items..." style={{ width: '100%', padding: 10, marginBottom: 16,
          background: T.bg, color: T.text, border: `1px solid ${T.border}`, borderRadius: 8,
          outline: 'none', boxSizing: 'border-box', fontSize: 14 }} />
      {filtered.map(cat => (
        <div key={cat.name} style={{ marginBottom: 16 }}>
          <h3 style={{ color: T.accent, margin: '0 0 8px', fontSize: 15 }}>
            {cat.icon} {cat.name} ({cat.items.length})
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
            {cat.items.map(item => (
              <div key={item.slug} style={{ background: T.bg, borderRadius: 8, padding: 10,
                border: `1px solid ${T.border}`, display: 'flex', gap: 10, alignItems: 'center' }}>
                {item.has_photo ? (
                  <img src={`${API_BASE}/api/images/menu/${item.slug}-thumb.jpg`}
                    style={{ width: 48, height: 48, borderRadius: 6, objectFit: 'cover' }}
                    onError={e => e.target.style.display = 'none'} />
                ) : (
                  <div style={{ width: 48, height: 48, borderRadius: 6, background: T.border,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: T.textDim, fontSize: 10, cursor: 'pointer' }}
                    onClick={() => handlePhotoUpload(item.slug)}>
                    + Photo
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {editing === item.slug ? (
                    <EditInline item={item} onSave={handleSave} onCancel={() => setEditing(null)} />
                  ) : <>
                    <div style={{ color: T.text, fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap',
                      overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                    <div style={{ color: T.accent, fontWeight: 700 }}>${item.price?.toFixed(2)}</div>
                  </>}
                </div>
                {editing !== item.slug && <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  <button onClick={() => setEditing(item.slug)} title="Edit"
                    style={{ background: 'transparent', border: 'none', color: T.blue, cursor: 'pointer', fontSize: 16 }}>&#9998;</button>
                  <button onClick={() => handleDelete(item.slug)} title="Delete"
                    style={{ background: 'transparent', border: 'none', color: T.red, cursor: 'pointer', fontSize: 16 }}>&#10005;</button>
                </div>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function EditInline({ item, onSave, onCancel }) {
  const [name, setName] = useState(item.name);
  const [price, setPrice] = useState(item.price);
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      <input value={name} onChange={e => setName(e.target.value)}
        style={{ flex: 1, padding: 4, background: T.bg, color: T.text, border: `1px solid ${T.border}`,
          borderRadius: 4, fontSize: 12, minWidth: 0 }} />
      <input type="number" step="0.01" value={price} onChange={e => setPrice(parseFloat(e.target.value) || 0)}
        style={{ width: 60, padding: 4, background: T.bg, color: T.text, border: `1px solid ${T.border}`,
          borderRadius: 4, fontSize: 12 }} />
      <button onClick={() => onSave(item.slug, { name, price })}
        style={{ background: T.green, color: '#fff', border: 'none', borderRadius: 4, padding: '4px 8px', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>Save</button>
      <button onClick={onCancel}
        style={{ background: T.border, color: T.textDim, border: 'none', borderRadius: 4, padding: '4px 8px', cursor: 'pointer', fontSize: 11 }}>X</button>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// CHA CLUB TAB
// ════════════════════════════════════════════════════════
function ChaClubTab({ pin }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [msg, setMsg] = useState('');

  const handleSearch = () => {
    if (!query.trim()) return;
    staffSearch(query, pin).then(d => setResults(d.results || [])).catch(e => setMsg(e.message));
  };

  const handleRedeem = (subscriberId, drinkName) => {
    staffRedeem(subscriberId, pin, drinkName).then(d => {
      setMsg(`Drink redeemed! ${drinkName}`);
      setSelected(null);
    }).catch(e => setMsg(e.message));
  };

  const drinks = ['Thai Iced Tea', 'Thai Iced Coffee', 'Lychee Juice', 'Mango Juice',
    'Coconut Water', 'Passion Fruit Juice', 'Guava Juice', 'Smoothie'];

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <input value={query} onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder="Search by name or phone..."
          style={{ flex: 1, padding: 12, background: T.bg, color: T.text, border: `1px solid ${T.border}`,
            borderRadius: 8, outline: 'none', fontSize: 14 }} />
        <button onClick={handleSearch}
          style={{ padding: '12px 24px', background: T.accent, color: '#000', border: 'none',
            borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>Search</button>
      </div>
      {msg && <div style={{ padding: 12, background: msg.includes('redeemed') ? T.green + '30' : T.red + '30',
        color: msg.includes('redeemed') ? T.green : T.red, borderRadius: 8, marginBottom: 12, fontSize: 14 }}>{msg}</div>}
      {results.map(m => (
        <div key={m.id} style={{ background: T.bg, borderRadius: 10, padding: 16, marginBottom: 10,
          border: `1px solid ${T.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ color: T.text, fontWeight: 700, fontSize: 16 }}>{m.name}</div>
              <div style={{ color: T.textDim, fontSize: 13 }}>{m.phone || m.email}</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>
                <span style={{ color: m.subscription_status === 'active' ? T.green : T.red, fontWeight: 600 }}>
                  {m.subscription_status?.toUpperCase()}
                </span>
                {m.redeemed_this_week && <span style={{ color: T.orange, marginLeft: 8 }}>Already redeemed this week</span>}
              </div>
            </div>
            {m.subscription_status === 'active' && !m.redeemed_this_week && (
              <button onClick={() => setSelected(selected === m.id ? null : m.id)}
                style={{ padding: '8px 16px', background: T.green, color: '#fff', border: 'none',
                  borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>
                Redeem Drink
              </button>
            )}
          </div>
          {selected === m.id && (
            <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {drinks.map(d => (
                <button key={d} onClick={() => handleRedeem(m.id, d)}
                  style={{ padding: '8px 14px', background: T.accent + '30', color: T.accent,
                    border: `1px solid ${T.accent}`, borderRadius: 20, cursor: 'pointer',
                    fontSize: 13, fontWeight: 600 }}>
                  {d}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
      {results.length === 0 && query && <p style={{ color: T.textDim, textAlign: 'center' }}>No members found</p>}
    </div>
  );
}

// ════════════════════════════════════════════════════════
// LOYALTY TAB
// ════════════════════════════════════════════════════════
function LoyaltyTab({ pin }) {
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState(null);

  const load = useCallback(() => {
    getLoyaltyMembers(pin).then(d => setMembers(d.members || [])).catch(() => {});
  }, [pin]);

  useEffect(() => { load(); }, [load]);

  const showDetail = (phone) => {
    getLoyaltyMember(pin, phone).then(setDetail).catch(() => {});
  };

  const filtered = members.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    (m.phone || '').includes(search)
  );

  return (
    <div>
      {detail ? (
        <div>
          <button onClick={() => setDetail(null)}
            style={{ background: 'transparent', border: 'none', color: T.accent, cursor: 'pointer',
              fontWeight: 600, marginBottom: 12 }}>Back to list</button>
          <div style={{ background: T.bg, borderRadius: 12, padding: 20, border: `1px solid ${T.border}` }}>
            <h3 style={{ color: T.text, margin: '0 0 4px' }}>{detail.name}</h3>
            <p style={{ color: T.textDim, margin: '0 0 16px' }}>{detail.phone}</p>
            <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
              <Stat label="Points" value={detail.points} color={T.accent} />
              <Stat label="Total Spent" value={`$${(detail.total_spent || 0).toFixed(2)}`} />
              <Stat label="Visits" value={detail.visits} />
            </div>
            <h4 style={{ color: T.textDim, margin: '0 0 8px' }}>Recent Orders</h4>
            {(detail.orders || []).map((o, i) => (
              <div key={i} style={{ padding: 8, borderBottom: `1px solid ${T.border}`, fontSize: 13, color: T.text }}>
                <span style={{ color: T.accent }}>#{o.order_number}</span> — ${o.total?.toFixed(2)} — {o.status}
                <span style={{ color: T.textDim, marginLeft: 8 }}>{o.created_at}</span>
              </div>
            ))}
            {!(detail.orders || []).length && <p style={{ color: T.textDim, fontSize: 13 }}>No orders yet</p>}
          </div>
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <Stat label="Total Members" value={members.length} />
            <Stat label="Total Points" value={members.reduce((s, m) => s + (m.points || 0), 0)} color={T.accent} />
          </div>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or phone..."
            style={{ width: '100%', padding: 10, marginBottom: 12, background: T.bg, color: T.text,
              border: `1px solid ${T.border}`, borderRadius: 8, outline: 'none', boxSizing: 'border-box' }} />
          <div style={{ background: T.bg, borderRadius: 10, border: `1px solid ${T.border}`, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1fr 1fr', padding: '10px 14px',
              background: T.border, fontSize: 12, color: T.textDim, fontWeight: 600 }}>
              <div>Name</div><div>Phone</div><div>Points</div><div>Spent</div><div>Visits</div><div>Last Visit</div>
            </div>
            {filtered.map(m => (
              <div key={m.id} onClick={() => showDetail(m.phone)}
                style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1fr 1fr', padding: '10px 14px',
                  borderBottom: `1px solid ${T.border}`, cursor: 'pointer', fontSize: 13, color: T.text,
                  transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = T.card}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <div style={{ fontWeight: 600 }}>{m.name}</div>
                <div style={{ color: T.textDim }}>{m.phone}</div>
                <div style={{ color: T.accent, fontWeight: 700 }}>{m.points}</div>
                <div>${(m.total_spent || 0).toFixed(2)}</div>
                <div>{m.visits}</div>
                <div style={{ color: T.textDim, fontSize: 11 }}>
                  {m.last_visit ? new Date(m.last_visit).toLocaleDateString() : '-'}
                </div>
              </div>
            ))}
            {!filtered.length && <div style={{ padding: 20, textAlign: 'center', color: T.textDim }}>
              {members.length ? 'No matches' : 'No loyalty members yet — members are created when orders include a phone number'}
            </div>}
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════
// CRM TAB
// ════════════════════════════════════════════════════════
function CRMTab({ pin }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    getCRMStats(pin).then(setData).catch(() => {});
  }, [pin]);

  if (!data) return <p style={{ color: T.textDim }}>Loading CRM data...</p>;

  const t = data.totals || {};
  const barMax = Math.max(...(data.daily_revenue || []).map(d => d.revenue), 1);

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <Stat label="Total Orders" value={t.total_orders || 0} />
        <Stat label="Total Revenue" value={`$${(t.total_revenue || 0).toFixed(2)}`} color={T.green} />
        <Stat label="Avg Order" value={`$${(t.avg_order_value || 0).toFixed(2)}`} color={T.accent} />
        <Stat label="Loyalty Members" value={data.loyalty?.total_members || 0} />
      </div>

      {/* Daily Revenue Chart */}
      <div style={{ background: T.card, borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <h4 style={{ color: T.text, margin: '0 0 12px' }}>Daily Revenue (14 days)</h4>
        {(data.daily_revenue || []).length === 0 ? (
          <p style={{ color: T.textDim, fontSize: 13 }}>No data yet — revenue will appear here as orders come in</p>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 120 }}>
            {(data.daily_revenue || []).map((d, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ fontSize: 9, color: T.textDim, marginBottom: 2 }}>${d.revenue.toFixed(0)}</div>
                <div style={{ width: '100%', height: Math.max(4, (d.revenue / barMax) * 100),
                  background: T.accent, borderRadius: '4px 4px 0 0' }} />
                <div style={{ fontSize: 9, color: T.textDim, marginTop: 2 }}>
                  {d.date ? d.date.slice(5) : ''}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* By Day of Week */}
        <div style={{ background: T.card, borderRadius: 12, padding: 16 }}>
          <h4 style={{ color: T.text, margin: '0 0 12px' }}>By Day of Week</h4>
          {(data.by_day_of_week || []).map((d, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0',
              borderBottom: `1px solid ${T.border}`, fontSize: 13, color: T.text }}>
              <span>{d.day}</span>
              <span>{d.orders} orders</span>
              <span style={{ color: T.accent }}>${d.revenue.toFixed(2)}</span>
            </div>
          ))}
          {!(data.by_day_of_week || []).length && <p style={{ color: T.textDim, fontSize: 13 }}>No data yet</p>}
        </div>

        {/* Top Items */}
        <div style={{ background: T.card, borderRadius: 12, padding: 16 }}>
          <h4 style={{ color: T.text, margin: '0 0 12px' }}>Top Items</h4>
          {(data.top_items || []).map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0',
              borderBottom: `1px solid ${T.border}`, fontSize: 13, color: T.text }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>{item.name}</span>
              <span style={{ color: T.accent, fontWeight: 600 }}>{item.count}</span>
            </div>
          ))}
          {!(data.top_items || []).length && <p style={{ color: T.textDim, fontSize: 13 }}>No data yet</p>}
        </div>

        {/* Peak Hours */}
        <div style={{ background: T.card, borderRadius: 12, padding: 16 }}>
          <h4 style={{ color: T.text, margin: '0 0 12px' }}>Peak Hours</h4>
          {(data.peak_hours || []).map((h, i) => {
            const maxH = Math.max(...(data.peak_hours || []).map(x => x.orders), 1);
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ color: T.textDim, fontSize: 12, width: 40 }}>
                  {h.hour > 12 ? (h.hour - 12) + 'pm' : h.hour + 'am'}
                </span>
                <div style={{ flex: 1, height: 16, background: T.bg, borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(h.orders / maxH) * 100}%`,
                    background: T.accent, borderRadius: 4 }} />
                </div>
                <span style={{ color: T.text, fontSize: 12, width: 24, textAlign: 'right' }}>{h.orders}</span>
              </div>
            );
          })}
          {!(data.peak_hours || []).length && <p style={{ color: T.textDim, fontSize: 13 }}>No data yet</p>}
        </div>

        {/* By Source */}
        <div style={{ background: T.card, borderRadius: 12, padding: 16 }}>
          <h4 style={{ color: T.text, margin: '0 0 12px' }}>Revenue by Source</h4>
          {(data.by_source || []).map((s, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0',
              borderBottom: `1px solid ${T.border}`, fontSize: 13, color: T.text }}>
              <span>{s.source}</span>
              <span>{s.orders} orders</span>
              <span style={{ color: T.green }}>${s.revenue.toFixed(2)}</span>
            </div>
          ))}
          {!(data.by_source || []).length && <p style={{ color: T.textDim, fontSize: 13 }}>No data yet</p>}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ════════════════════════════════════════════════════════
export default function ThaiHouseDashboard() {
  const [pin, setPin] = useState(null);
  const [tab, setTab] = useState('orders');
  const [orderBadge, setOrderBadge] = useState(0);

  // Poll for new order count for badge
  useEffect(() => {
    if (!pin) return;
    const poll = () => {
      getOrderStats(pin).then(d => setOrderBadge(d.new_orders || 0)).catch(() => {});
    };
    poll();
    const iv = setInterval(poll, 5000);
    return () => clearInterval(iv);
  }, [pin]);

  const handleAuth = (tryPin, setErr) => {
    // Verify PIN by making an API call
    getOrderStats(tryPin).then(() => {
      setPin(tryPin);
    }).catch(() => setErr('Invalid PIN'));
  };

  if (!pin) return <PinGate onAuth={handleAuth} />;

  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.text }}>
      {/* Header */}
      <div style={{ background: T.card, borderBottom: `1px solid ${T.border}`, padding: '0 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <h1 style={{ margin: 0, fontSize: 20, color: T.accent, padding: '12px 0' }}>Thai House</h1>
          <div style={{ display: 'flex', gap: 0 }}>
            <TabBtn label="Orders" active={tab === 'orders'} onClick={() => setTab('orders')} badge={orderBadge} />
            <TabBtn label="Tables" active={tab === 'tables'} onClick={() => setTab('tables')} />
            <TabBtn label="Menu" active={tab === 'menu'} onClick={() => setTab('menu')} />
            <TabBtn label="Cha Club" active={tab === 'chaclub'} onClick={() => setTab('chaclub')} />
            <TabBtn label="Loyalty" active={tab === 'loyalty'} onClick={() => setTab('loyalty')} />
            <TabBtn label="CRM" active={tab === 'crm'} onClick={() => setTab('crm')} />
          </div>
        </div>
        <div style={{ color: T.textDim, fontSize: 12 }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
        </div>
      </div>

      {/* Tab Content */}
      <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
        {tab === 'orders' && <OrdersTab pin={pin} />}
        {tab === 'tables' && <TablesTab pin={pin} />}
        {tab === 'menu' && <MenuTab pin={pin} />}
        {tab === 'chaclub' && <ChaClubTab pin={pin} />}
        {tab === 'loyalty' && <LoyaltyTab pin={pin} />}
        {tab === 'crm' && <CRMTab pin={pin} />}
      </div>
    </div>
  );
}
