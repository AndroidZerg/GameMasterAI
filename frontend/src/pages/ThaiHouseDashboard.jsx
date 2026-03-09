import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getAdminOrders, confirmOrder, completeOrder, rejectOrder, reprintVenueOrder, getOrderStats,
  getFloorPlan, updateFloorTables, updateFloorZones, addFloorTable, deleteFloorTable, updateTableParty,
  getMenuItems, createMenuItem, updateMenuItem, deleteMenuItem, uploadMenuPhoto, deleteMenuPhoto,
  getToggles, createToggle, updateToggle, deleteToggle,
  getItemGalleryImages, uploadGalleryImage, updateGalleryImage, deleteGalleryImage, bulkImportGalleryImages,
  getLoyaltyMembers, getLoyaltyMember, redeemReward,
  getCRMStats, staffSearch, staffRedeem, getChaClubMembers, addChaClubMember,
  getLoyaltyRewards, createLoyaltyReward, updateLoyaltyReward, deleteLoyaltyReward,
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
const ZONE_COLORS = ['#2a3025','#2a2540','#402a25','#253040','#3a2a3a','#2a3a2a','#3a3025','#25303a'];
const HANDLE_SIZE = 10;
const HANDLE_POSITIONS = {
  nw: (z) => ({ x: z.x, y: z.y }),
  n:  (z) => ({ x: z.x + z.w/2, y: z.y }),
  ne: (z) => ({ x: z.x + z.w, y: z.y }),
  e:  (z) => ({ x: z.x + z.w, y: z.y + z.h/2 }),
  se: (z) => ({ x: z.x + z.w, y: z.y + z.h }),
  s:  (z) => ({ x: z.x + z.w/2, y: z.y + z.h }),
  sw: (z) => ({ x: z.x, y: z.y + z.h }),
  w:  (z) => ({ x: z.x, y: z.y + z.h/2 }),
};
const HANDLE_CURSORS = { nw:'nwse-resize', n:'ns-resize', ne:'nesw-resize', e:'ew-resize', se:'nwse-resize', s:'ns-resize', sw:'nesw-resize', w:'ew-resize' };

function TablesTab({ pin }) {
  const [tables, setTables] = useState([]);
  const [zones, setZones] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [draggingTable, setDraggingTable] = useState(null);
  const [draggingZone, setDraggingZone] = useState(null);
  const [resizingZone, setResizingZone] = useState(null);
  const [selectedZone, setSelectedZone] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState(null);
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
    ]).then(() => { setEditMode(false); setSelectedZone(null); load(); });
  };

  const handleAddTable = () => {
    const num = tables.length > 0 ? Math.max(...tables.map(t => t.num)) + 1 : 1;
    setTables([...tables, { num, x: 100, y: 100, w: 90, h: 50, type: 'table', seats: 4, label: 'Table', zone: '' }]);
  };

  const handleAddZone = () => {
    setZones([...zones, { label: 'New Zone', x: 60, y: 60, w: 200, h: 150, color: '#2a3025', is_entrance: false }]);
    setSelectedZone(zones.length);
  };

  // ── Mouse handlers ──
  const getPos = (e) => {
    const rect = containerRef.current.getBoundingClientRect();
    return { mx: e.clientX - rect.left, my: e.clientY - rect.top };
  };

  const handleTableMouseDown = (e, idx) => {
    if (!editMode) return;
    e.stopPropagation();
    const { mx, my } = getPos(e);
    setDraggingTable(idx);
    setDragOffset({ x: mx - tables[idx].x, y: my - tables[idx].y });
    setSelectedZone(null);
  };

  const handleZoneMouseDown = (e, idx) => {
    if (!editMode) return;
    e.stopPropagation();
    const { mx, my } = getPos(e);
    setSelectedZone(idx);
    setDraggingZone(idx);
    setDragOffset({ x: mx - zones[idx].x, y: my - zones[idx].y });
  };

  const handleHandleMouseDown = (e, handle) => {
    if (selectedZone === null) return;
    e.stopPropagation();
    const { mx, my } = getPos(e);
    setResizingZone({ idx: selectedZone, handle });
    setResizeStart({ mx, my, ...zones[selectedZone] });
  };

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const { mx, my } = getPos(e);
    const cw = containerRef.current.offsetWidth;
    const ch = containerRef.current.offsetHeight;

    if (draggingTable !== null) {
      const x = Math.max(0, Math.min(mx - dragOffset.x, cw - 90));
      const y = Math.max(0, Math.min(my - dragOffset.y, ch - 50));
      setTables(prev => prev.map((t, i) => i === draggingTable ? { ...t, x, y } : t));
    } else if (draggingZone !== null && !resizingZone) {
      const z = zones[draggingZone];
      const x = Math.max(0, Math.min(mx - dragOffset.x, cw - z.w));
      const y = Math.max(0, Math.min(my - dragOffset.y, ch - z.h));
      setZones(prev => prev.map((zn, i) => i === draggingZone ? { ...zn, x, y } : zn));
    } else if (resizingZone && resizeStart) {
      const { handle, idx } = resizingZone;
      const dx = mx - resizeStart.mx;
      const dy = my - resizeStart.my;
      let { x, y, w, h } = resizeStart;
      const MIN_W = 60, MIN_H = 40;

      if (handle.includes('e')) w = Math.max(MIN_W, resizeStart.w + dx);
      if (handle.includes('w')) { w = Math.max(MIN_W, resizeStart.w - dx); x = resizeStart.x + resizeStart.w - w; }
      if (handle.includes('s')) h = Math.max(MIN_H, resizeStart.h + dy);
      if (handle.includes('n')) { h = Math.max(MIN_H, resizeStart.h - dy); y = resizeStart.y + resizeStart.h - h; }

      setZones(prev => prev.map((zn, i) => i === idx ? { ...zn, x, y, w, h } : zn));
    }
  };

  const handleMouseUp = () => {
    setDraggingTable(null);
    setDraggingZone(null);
    setResizingZone(null);
    setResizeStart(null);
  };

  const handleCanvasClick = (e) => {
    if (e.target === containerRef.current) setSelectedZone(null);
  };

  const totalSeats = tables.reduce((s, t) => s + (t.seats || 4), 0);
  const toolbarBtn = (bg, label, onClick) => (
    <button onClick={onClick} style={{ padding: '8px 16px', background: bg, color: bg === T.accent ? '#000' : '#fff',
      border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>{label}</button>
  );

  return (
    <div style={{ display: 'flex', gap: 16 }}>
      {/* Main canvas area */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'center' }}>
          <Stat label="Tables" value={tables.length} />
          <Stat label="Total Seats" value={totalSeats} />
          <div style={{ flex: 1 }} />
          {editMode ? <>
            {toolbarBtn(T.blue, '+ Table', handleAddTable)}
            {toolbarBtn(T.orange, '+ Zone', handleAddZone)}
            {toolbarBtn(T.green, 'Save', handleSave)}
            {toolbarBtn(T.border, 'Cancel', () => { setEditMode(false); setSelectedZone(null); load(); })}
          </> : toolbarBtn(T.accent, 'Edit Mode', () => setEditMode(true))}
        </div>
        <div ref={containerRef} onClick={handleCanvasClick}
          onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
          style={{ position: 'relative', width: '100%', height: 'calc(100vh - 200px)', minHeight: 500,
            background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, overflow: 'hidden' }}>
          {/* Zones */}
          {zones.map((z, i) => (
            <div key={`z-${i}`}
              onMouseDown={(e) => handleZoneMouseDown(e, i)}
              style={{
                position: 'absolute', left: z.x, top: z.y, width: z.w, height: z.h,
                background: z.is_entrance ? 'rgba(76,175,80,0.15)' : (z.color + '30'),
                border: selectedZone === i ? `2px solid ${T.accent}` : `1px dashed ${z.is_entrance ? T.green : T.border}`,
                borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: T.textDim, fontSize: 13, fontWeight: 600,
                cursor: editMode ? 'move' : 'default', userSelect: 'none',
              }}>
              {z.is_entrance ? 'Entrance' : z.label}
            </div>
          ))}
          {/* Resize handles for selected zone */}
          {editMode && selectedZone !== null && zones[selectedZone] && Object.entries(HANDLE_POSITIONS).map(([key, posFn]) => {
            const pos = posFn(zones[selectedZone]);
            return (
              <div key={`h-${key}`}
                onMouseDown={(e) => handleHandleMouseDown(e, key)}
                style={{
                  position: 'absolute', left: pos.x - HANDLE_SIZE/2, top: pos.y - HANDLE_SIZE/2,
                  width: HANDLE_SIZE, height: HANDLE_SIZE, background: T.accent, border: `1px solid ${T.bg}`,
                  cursor: HANDLE_CURSORS[key], zIndex: 10, borderRadius: 2,
                }} />
            );
          })}
          {/* Tables */}
          {tables.map((t, i) => (
            <div key={`t-${i}`}
              onMouseDown={(e) => handleTableMouseDown(e, i)}
              onDoubleClick={() => {
                if (!editMode) return;
                const seats = prompt('Party size / seats:', t.seats);
                if (seats) setTables(prev => prev.map((tb, j) => j === i ? { ...tb, seats: parseInt(seats) || 4 } : tb));
              }}
              style={{
                position: 'absolute', left: t.x, top: t.y, width: t.w || 90, height: t.h || 50,
                background: T.accent + '20', border: `2px solid ${T.accent}`, borderRadius: 8,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                cursor: editMode ? 'move' : 'default', userSelect: 'none', zIndex: 5,
              }}>
              <span style={{ color: T.accent, fontWeight: 700, fontSize: 14 }}>{t.num}</span>
              <span style={{ color: T.textDim, fontSize: 10 }}>{t.seats} seats</span>
              {editMode && <button onClick={(e) => { e.stopPropagation(); setTables(tables.filter((_, j) => j !== i)); }}
                style={{ position: 'absolute', top: -8, right: -8, background: T.red, color: '#fff',
                  border: 'none', borderRadius: '50%', width: 18, height: 18, fontSize: 11,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 6 }}>x</button>}
            </div>
          ))}
        </div>
      </div>
      {/* Zone sidebar — only visible when a zone is selected in edit mode */}
      {editMode && selectedZone !== null && zones[selectedZone] && (
        <div style={{ width: 240, background: T.card, borderRadius: 12, padding: 16,
          border: `1px solid ${T.border}`, alignSelf: 'flex-start', position: 'sticky', top: 16 }}>
          <h4 style={{ color: T.accent, margin: '0 0 12px', fontSize: 14 }}>Zone Properties</h4>
          <label style={{ color: T.textDim, fontSize: 11, display: 'block', marginBottom: 4 }}>Label</label>
          <input value={zones[selectedZone].label}
            onChange={e => setZones(prev => prev.map((z, i) => i === selectedZone ? { ...z, label: e.target.value } : z))}
            style={{ width: '100%', padding: 8, background: T.bg, color: T.text, border: `1px solid ${T.border}`,
              borderRadius: 6, fontSize: 13, marginBottom: 12, boxSizing: 'border-box', outline: 'none' }} />
          <label style={{ color: T.textDim, fontSize: 11, display: 'block', marginBottom: 4 }}>Color</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            {ZONE_COLORS.map(c => (
              <div key={c} onClick={() => setZones(prev => prev.map((z, i) => i === selectedZone ? { ...z, color: c } : z))}
                style={{ width: 24, height: 24, borderRadius: 4, background: c, cursor: 'pointer',
                  border: zones[selectedZone].color === c ? `2px solid ${T.accent}` : `1px solid ${T.border}` }} />
            ))}
          </div>
          <label style={{ color: T.textDim, fontSize: 11, display: 'block', marginBottom: 8 }}>
            Size: {Math.round(zones[selectedZone].w)} x {Math.round(zones[selectedZone].h)}
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: T.text, fontSize: 13, marginBottom: 16, cursor: 'pointer' }}>
            <input type="checkbox" checked={zones[selectedZone].is_entrance}
              onChange={e => setZones(prev => prev.map((z, i) => i === selectedZone ? { ...z, is_entrance: e.target.checked } : z))} />
            Is Entrance
          </label>
          <button onClick={() => { setZones(zones.filter((_, i) => i !== selectedZone)); setSelectedZone(null); }}
            style={{ width: '100%', padding: 8, background: T.red, color: '#fff', border: 'none',
              borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Delete Zone</button>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════
// MENU TAB — Side Panel Editor
// ════════════════════════════════════════════════════════
function MenuTab({ pin }) {
  const [categories, setCategories] = useState([]);
  const [togglesList, setTogglesList] = useState([]);
  const [selected, setSelected] = useState(null); // slug of selected item
  const [search, setSearch] = useState('');
  // Edit form state
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editPrice, setEditPrice] = useState(0);
  const [editToggles, setEditToggles] = useState([]);
  const [editMods, setEditMods] = useState(false);
  const [editCat, setEditCat] = useState('');
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  // Gallery state
  const [galleryImages, setGalleryImages] = useState([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [showGallery, setShowGallery] = useState(true);
  const [showHidden, setShowHidden] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);
  const [galleryDragOver, setGalleryDragOver] = useState(false);

  const load = useCallback(() => {
    getMenuItems(pin).then(d => {
      setCategories(d.categories || []);
      setTogglesList(d.toggles || []);
    }).catch(() => {});
  }, [pin]);

  useEffect(() => { load(); }, [load]);

  // Find selected item across categories
  const selectedItem = (() => {
    if (!selected) return null;
    for (const cat of categories) {
      const item = cat.items.find(i => i.slug === selected);
      if (item) return { ...item, category: cat.name };
    }
    return null;
  })();

  // Populate edit form when selection changes
  useEffect(() => {
    if (selectedItem) {
      setEditName(selectedItem.name);
      setEditDesc(selectedItem.description || '');
      setEditPrice(selectedItem.price);
      setEditToggles(selectedItem.toggles || []);
      setEditMods(selectedItem.allows_modifications || false);
      setEditCat(selectedItem.category);
    }
  }, [selected]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load gallery images when selection changes
  useEffect(() => {
    if (!selected) { setGalleryImages([]); return; }
    setGalleryLoading(true);
    getItemGalleryImages(selected, pin)
      .then(d => setGalleryImages(d.images || []))
      .catch(() => setGalleryImages([]))
      .finally(() => setGalleryLoading(false));
  }, [selected, pin]);

  const loadGallery = () => {
    if (!selected) return;
    getItemGalleryImages(selected, pin)
      .then(d => setGalleryImages(d.images || []))
      .catch(() => {});
  };

  const handleGalleryUpload = (file) => {
    if (!selected || !file) return;
    setUploading(true);
    uploadGalleryImage(selected, file, pin)
      .then(() => loadGallery())
      .catch(() => {})
      .finally(() => setUploading(false));
  };

  const handleGalleryDrop = (e) => {
    e.preventDefault(); setGalleryDragOver(false);
    const files = Array.from(e.dataTransfer?.files || []).filter(f => f.type.startsWith('image/'));
    files.forEach(f => handleGalleryUpload(f));
  };

  const handleGalleryUploadClick = () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*'; input.multiple = true;
    input.onchange = (e) => {
      Array.from(e.target.files).forEach(f => handleGalleryUpload(f));
    };
    input.click();
  };

  const handleSetActive = (imgId) => {
    updateGalleryImage(imgId, { status: 'active' }, pin).then(() => loadGallery());
  };

  const handleHideImage = (imgId) => {
    updateGalleryImage(imgId, { status: 'hidden' }, pin).then(() => loadGallery());
  };

  const handleDeleteGalleryImage = (imgId) => {
    if (!confirm('Delete this image permanently?')) return;
    deleteGalleryImage(imgId, pin).then(() => loadGallery());
  };

  const handleImportUrl = () => {
    if (!selected || !importUrl.trim()) return;
    setUploading(true);
    // Use the slug endpoint with url param via query string
    fetch(`${API_BASE}/api/admin/menu-images/${selected}/import-url?url=${encodeURIComponent(importUrl.trim())}`, {
      method: 'POST', headers: { 'X-Staff-Pin': pin },
    }).then(r => r.json()).then(() => { setImportUrl(''); loadGallery(); })
      .catch(() => {}).finally(() => setUploading(false));
  };

  const handleBulkImport = () => {
    if (!confirm('Import all Ranger drink photos? This may take several minutes.')) return;
    setBulkImporting(true); setBulkResult(null);
    bulkImportGalleryImages(pin)
      .then(r => setBulkResult(r))
      .catch(e => setBulkResult({ error: e.message }))
      .finally(() => setBulkImporting(false));
  };

  const filtered = categories.map(cat => ({
    ...cat,
    items: cat.items.filter(it => it.name.toLowerCase().includes(search.toLowerCase())),
  })).filter(cat => cat.items.length > 0);

  const totalItems = categories.reduce((s, c) => s + c.items.length, 0);
  const withPhotos = categories.reduce((s, c) => s + c.items.filter(i => i.has_photo).length, 0);

  const handleSave = () => {
    if (!selected) return;
    setSaving(true);
    updateMenuItem(selected, {
      name: editName, description: editDesc, price: editPrice,
      toggles: editToggles, allows_modifications: editMods,
    }, pin).then(() => { load(); setSaving(false); }).catch(() => setSaving(false));
  };

  const handleDelete = () => {
    if (!selected || !confirm(`Delete "${editName}"?`)) return;
    deleteMenuItem(selected, pin).then(() => { setSelected(null); load(); });
  };

  const handlePhotoUpload = (file) => {
    if (!selected || !file) return;
    uploadMenuPhoto(selected, file, pin).then(load);
  };

  const handlePhotoDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file && file.type.startsWith('image/')) handlePhotoUpload(file);
  };

  const handlePhotoClick = () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*';
    input.onchange = (e) => { if (e.target.files[0]) handlePhotoUpload(e.target.files[0]); };
    input.click();
  };

  const handlePhotoDelete = () => {
    if (!selected) return;
    deleteMenuPhoto(selected, pin).then(load);
  };

  const toggleToggle = (tid) => {
    setEditToggles(prev => prev.includes(tid) ? prev.filter(t => t !== tid) : [...prev, tid]);
  };

  const inputStyle = { width: '100%', padding: 8, background: T.bg, color: T.text,
    border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 13, boxSizing: 'border-box', outline: 'none' };

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <Stat label="Total Items" value={totalItems} />
        <Stat label="With Photos" value={withPhotos} color={T.green} />
        <Stat label="Categories" value={categories.length} />
        <Stat label="Toggles" value={togglesList.length} />
        <button onClick={handleBulkImport} disabled={bulkImporting}
          style={{ padding: '8px 14px', background: T.blue, color: '#fff', border: 'none',
            borderRadius: 8, fontWeight: 600, fontSize: 12, cursor: 'pointer',
            opacity: bulkImporting ? 0.6 : 1, whiteSpace: 'nowrap' }}>
          {bulkImporting ? 'Importing...' : 'Import Ranger Photos'}
        </button>
        {bulkResult && (
          <span style={{ color: bulkResult.error ? T.red : T.green, fontSize: 12, alignSelf: 'center' }}>
            {bulkResult.error || `${bulkResult.imported} imported, ${bulkResult.skipped} skipped, ${bulkResult.failed} failed`}
          </span>
        )}
      </div>
      <div style={{ display: 'flex', gap: 16 }}>
        {/* Left: item grid */}
        <div style={{ flex: 1, minWidth: 0, maxHeight: 'calc(100vh - 240px)', overflowY: 'auto', paddingRight: 4 }}>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search items..." style={{ ...inputStyle, marginBottom: 12, padding: 10, fontSize: 14 }} />
          {filtered.map(cat => (
            <div key={cat.name} style={{ marginBottom: 14 }}>
              <h3 style={{ color: T.accent, margin: '0 0 8px', fontSize: 14 }}>
                {cat.icon} {cat.name} ({cat.items.length})
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 6 }}>
                {cat.items.map(item => (
                  <div key={item.slug} onClick={() => setSelected(item.slug)}
                    style={{ background: T.bg, borderRadius: 8, padding: 8, cursor: 'pointer',
                      border: selected === item.slug ? `2px solid ${T.accent}` : `1px solid ${T.border}`,
                      display: 'flex', gap: 8, alignItems: 'center', transition: 'border-color 0.15s' }}>
                    {item.has_photo && item.image ? (
                      <img src={`${API_BASE}/api/images/menu/${item.image}-thumb.jpg`}
                        style={{ width: 40, height: 40, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }}
                        onError={e => e.target.style.display = 'none'} />
                    ) : (
                      <div style={{ width: 40, height: 40, borderRadius: 4, background: T.border, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.textDim, fontSize: 9 }}>
                        No img
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: T.text, fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap',
                        overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                      <div style={{ color: T.accent, fontWeight: 700, fontSize: 13 }}>${item.price?.toFixed(2)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        {/* Right: edit panel */}
        <div style={{
          width: selected ? 320 : 0, overflow: 'hidden',
          transition: 'width 0.25s ease', flexShrink: 0,
        }}>
          {selectedItem && (
            <div style={{ width: 320, background: T.card, borderRadius: 12, padding: 16,
              border: `1px solid ${T.border}`, position: 'sticky', top: 0 }}>
              {/* Photo area */}
              <div onClick={handlePhotoClick}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handlePhotoDrop}
                style={{
                  width: '100%', height: 200, borderRadius: 10, marginBottom: 14,
                  background: dragOver ? T.accent + '20' : T.bg,
                  border: `2px dashed ${dragOver ? T.accent : T.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', overflow: 'hidden', position: 'relative',
                }}>
                {selectedItem.has_photo && selectedItem.image ? (
                  <img src={`${API_BASE}/api/images/menu/${selectedItem.image}.jpg?t=${Date.now()}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ color: T.textDim, fontSize: 13 }}>Click or drop image</span>
                )}
              </div>
              {selectedItem.has_photo && (
                <button onClick={handlePhotoDelete}
                  style={{ width: '100%', padding: 6, background: 'transparent', color: T.red,
                    border: `1px solid ${T.red}30`, borderRadius: 6, cursor: 'pointer',
                    fontSize: 12, marginBottom: 12 }}>Remove Photo</button>
              )}

              {/* Image Gallery */}
              <div style={{ marginBottom: 12 }}>
                <div onClick={() => setShowGallery(!showGallery)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', marginBottom: 8 }}>
                  <span style={{ color: T.accent, fontSize: 12, fontWeight: 700 }}>
                    {showGallery ? '\u25BC' : '\u25B6'} Image Gallery ({galleryImages.length})
                  </span>
                </div>
                {showGallery && (
                  <div>
                    {galleryLoading ? (
                      <div style={{ color: T.textDim, fontSize: 12, padding: 8 }}>Loading...</div>
                    ) : (
                      <>
                        {/* Thumbnail grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 6, marginBottom: 8 }}>
                          {galleryImages
                            .filter(img => showHidden || img.status !== 'hidden')
                            .map(img => (
                            <div key={img.id} style={{
                              position: 'relative', borderRadius: 6, overflow: 'hidden',
                              border: img.status === 'active' ? `2px solid ${T.green}` : `1px solid ${T.border}`,
                              opacity: img.status === 'hidden' ? 0.4 : 1,
                              cursor: 'pointer', aspectRatio: '1',
                            }}>
                              <img
                                src={`${API_BASE}/api/public/menu-images/${img.id}/thumb`}
                                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                onClick={() => handleSetActive(img.id)}
                                title={img.status === 'active' ? 'Active image' : 'Click to set as active'}
                              />
                              {img.status === 'active' && (
                                <div style={{ position: 'absolute', top: 2, left: 2, background: T.green,
                                  borderRadius: '50%', width: 18, height: 18, display: 'flex',
                                  alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff' }}>
                                  &#10003;
                                </div>
                              )}
                              {/* Action buttons */}
                              <div style={{ position: 'absolute', top: 2, right: 2, display: 'flex', gap: 2 }}>
                                {img.status !== 'hidden' && (
                                  <button onClick={(e) => { e.stopPropagation(); handleHideImage(img.id); }}
                                    title="Hide"
                                    style={{ background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff',
                                      borderRadius: 3, width: 18, height: 18, fontSize: 10, cursor: 'pointer',
                                      display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    &#128065;
                                  </button>
                                )}
                                <button onClick={(e) => { e.stopPropagation(); handleDeleteGalleryImage(img.id); }}
                                  title="Delete"
                                  style={{ background: 'rgba(0,0,0,0.6)', border: 'none', color: T.red,
                                    borderRadius: 3, width: 18, height: 18, fontSize: 11, cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  &#10005;
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Show hidden toggle */}
                        {galleryImages.some(img => img.status === 'hidden') && (
                          <label style={{ display: 'flex', alignItems: 'center', gap: 4, color: T.textDim,
                            fontSize: 11, cursor: 'pointer', marginBottom: 6 }}>
                            <input type="checkbox" checked={showHidden} onChange={e => setShowHidden(e.target.checked)} />
                            Show hidden ({galleryImages.filter(i => i.status === 'hidden').length})
                          </label>
                        )}

                        {/* Upload drop zone */}
                        <div
                          onClick={handleGalleryUploadClick}
                          onDragOver={e => { e.preventDefault(); setGalleryDragOver(true); }}
                          onDragLeave={() => setGalleryDragOver(false)}
                          onDrop={handleGalleryDrop}
                          style={{
                            padding: 10, borderRadius: 6, textAlign: 'center',
                            background: galleryDragOver ? T.accent + '20' : T.bg,
                            border: `1px dashed ${galleryDragOver ? T.accent : T.border}`,
                            cursor: 'pointer', fontSize: 11, color: T.textDim, marginBottom: 6,
                          }}>
                          {uploading ? 'Uploading...' : 'Drop images or click to upload'}
                        </div>

                        {/* Import URL input */}
                        <div style={{ display: 'flex', gap: 4 }}>
                          <input value={importUrl} onChange={e => setImportUrl(e.target.value)}
                            placeholder="Paste image URL..."
                            style={{ flex: 1, padding: 6, background: T.bg, color: T.text,
                              border: `1px solid ${T.border}`, borderRadius: 4, fontSize: 11, outline: 'none' }}
                            onKeyDown={e => e.key === 'Enter' && handleImportUrl()} />
                          <button onClick={handleImportUrl} disabled={!importUrl.trim() || uploading}
                            style={{ padding: '6px 10px', background: T.accent, color: '#000', border: 'none',
                              borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                              opacity: (!importUrl.trim() || uploading) ? 0.5 : 1 }}>
                            Import
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Name */}
              <label style={{ color: T.textDim, fontSize: 11, display: 'block', marginBottom: 3 }}>Name</label>
              <input value={editName} onChange={e => setEditName(e.target.value)}
                style={{ ...inputStyle, fontSize: 15, fontWeight: 600, marginBottom: 10 }} />

              {/* Description */}
              <label style={{ color: T.textDim, fontSize: 11, display: 'block', marginBottom: 3 }}>Description</label>
              <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={3}
                style={{ ...inputStyle, resize: 'vertical', marginBottom: 10, fontFamily: 'inherit' }} />

              {/* Price */}
              <label style={{ color: T.textDim, fontSize: 11, display: 'block', marginBottom: 3 }}>Price</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 10 }}>
                <span style={{ color: T.accent, fontWeight: 700 }}>$</span>
                <input type="number" step="0.01" value={editPrice}
                  onChange={e => setEditPrice(parseFloat(e.target.value) || 0)}
                  style={{ ...inputStyle, flex: 1 }} />
              </div>

              {/* Category */}
              <label style={{ color: T.textDim, fontSize: 11, display: 'block', marginBottom: 3 }}>Category</label>
              <select value={editCat} onChange={e => setEditCat(e.target.value)}
                style={{ ...inputStyle, marginBottom: 10 }}>
                {categories.map(c => <option key={c.name} value={c.name}>{c.icon} {c.name}</option>)}
              </select>

              {/* Toggles */}
              <label style={{ color: T.textDim, fontSize: 11, display: 'block', marginBottom: 6 }}>Customization Toggles</label>
              <div style={{ marginBottom: 10 }}>
                {togglesList.map(tg => (
                  <label key={tg.id} style={{ display: 'flex', alignItems: 'center', gap: 6, color: T.text,
                    fontSize: 13, marginBottom: 4, cursor: 'pointer' }}>
                    <input type="checkbox" checked={editToggles.includes(tg.id)}
                      onChange={() => toggleToggle(tg.id)} />
                    {tg.name}
                  </label>
                ))}
              </div>

              {/* Allow modifications */}
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: T.text,
                fontSize: 13, marginBottom: 16, cursor: 'pointer' }}>
                <input type="checkbox" checked={editMods} onChange={e => setEditMods(e.target.checked)} />
                Allow special instructions
              </label>

              {/* Actions */}
              <button onClick={handleSave} disabled={saving}
                style={{ width: '100%', padding: 10, background: T.accent, color: '#000',
                  border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer',
                  marginBottom: 8, opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleDelete}
                  style={{ flex: 1, padding: 8, background: 'transparent', color: T.red,
                    border: `1px solid ${T.red}30`, borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>
                  Delete Item
                </button>
                <button onClick={() => setSelected(null)}
                  style={{ flex: 1, padding: 8, background: 'transparent', color: T.textDim,
                    border: `1px solid ${T.border}`, borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// CHA CLUB TAB — All Members with Filter
// ════════════════════════════════════════════════════════
function ChaClubTab({ pin }) {
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMember, setNewMember] = useState({ name: '', phone: '', email: '' });
  const [addLoading, setAddLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    getChaClubMembers(pin).then(d => {
      setMembers(d.members || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [pin]);

  useEffect(() => { load(); }, [load]);

  const handleRedeem = (subscriberId, drinkName) => {
    staffRedeem(subscriberId, pin, drinkName).then(() => {
      setMsg(`Drink redeemed! ${drinkName}`);
      setSelected(null);
      load();
    }).catch(e => setMsg(e.message));
  };

  const handleAddMember = () => {
    if (!newMember.name.trim() || !newMember.phone.trim()) {
      setMsg('Name and phone are required');
      return;
    }
    setAddLoading(true);
    addChaClubMember(pin, newMember).then(() => {
      setMsg(`Added ${newMember.name}!`);
      setNewMember({ name: '', phone: '', email: '' });
      setShowAddModal(false);
      load();
    }).catch(e => setMsg(e.message)).finally(() => setAddLoading(false));
  };

  // Clear message after 4 seconds
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(''), 4000);
    return () => clearTimeout(t);
  }, [msg]);

  const drinks = ['Thai Iced Tea', 'Thai Iced Coffee', 'Lychee Juice', 'Mango Juice',
    'Coconut Water', 'Passion Fruit Juice', 'Guava Juice', 'Smoothie'];

  const filtered = members.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    (m.phone || '').includes(search) ||
    (m.email || '').toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = members.filter(m => m.status === 'active').length;
  const availableCount = members.filter(m => m.status === 'active' && !m.redeemed_this_week).length;

  return (
    <div>
      {/* Stats + Add button */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <Stat label="Total Members" value={members.length} />
        <Stat label="Active" value={activeCount} color={T.green} />
        <Stat label="Drinks Available" value={availableCount} color={T.blue} />
        <button onClick={() => setShowAddModal(true)}
          style={{ marginLeft: 'auto', padding: '8px 18px', background: T.accent, color: '#000',
            border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>
          + Add Member
        </button>
      </div>

      {/* Add Member Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setShowAddModal(false)}>
          <div style={{ background: T.card, borderRadius: 14, padding: 24, width: 340,
            border: `1px solid ${T.border}` }} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: T.text, margin: '0 0 16px' }}>Add Cha Club Member</h3>
            {[
              { label: 'Name *', key: 'name', placeholder: 'Full name' },
              { label: 'Phone *', key: 'phone', placeholder: '7021234567' },
              { label: 'Email', key: 'email', placeholder: 'optional@email.com' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 12 }}>
                <label style={{ color: T.textDim, fontSize: 12, display: 'block', marginBottom: 4 }}>{f.label}</label>
                <input value={newMember[f.key]} onChange={e => setNewMember(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  style={{ width: '100%', padding: 10, background: T.bg, color: T.text,
                    border: `1px solid ${T.border}`, borderRadius: 8, outline: 'none', boxSizing: 'border-box', fontSize: 14 }} />
              </div>
            ))}
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button onClick={() => setShowAddModal(false)}
                style={{ flex: 1, padding: 10, background: T.bg, color: T.textDim, border: `1px solid ${T.border}`,
                  borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>Cancel</button>
              <button onClick={handleAddMember} disabled={addLoading}
                style={{ flex: 1, padding: 10, background: T.accent, color: '#000', border: 'none',
                  borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 14,
                  opacity: addLoading ? 0.6 : 1 }}>
                {addLoading ? 'Adding...' : 'Add Member'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success/error message */}
      {msg && <div style={{ padding: 12, background: msg.includes('redeemed') ? T.green + '20' : T.red + '20',
        color: msg.includes('redeemed') ? T.green : T.red, borderRadius: 8, marginBottom: 12, fontSize: 14, fontWeight: 600 }}>{msg}</div>}

      {/* Search */}
      <input value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Search members..."
        style={{ width: '100%', padding: 10, marginBottom: 12, background: T.bg, color: T.text,
          border: `1px solid ${T.border}`, borderRadius: 8, outline: 'none', boxSizing: 'border-box', fontSize: 14 }} />

      {loading ? (
        <p style={{ color: T.textDim, textAlign: 'center' }}>Loading members...</p>
      ) : (
        /* Member table */
        <div style={{ background: T.bg, borderRadius: 10, border: `1px solid ${T.border}`, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr', padding: '10px 14px',
            background: T.border, fontSize: 12, color: T.textDim, fontWeight: 600 }}>
            <div>Name</div><div>Phone</div><div>Status</div><div>This Week</div>
          </div>
          {filtered.map(m => (
            <div key={m.id}>
              <div onClick={() => {
                if (m.status === 'active' && !m.redeemed_this_week) {
                  setSelected(selected === m.id ? null : m.id);
                }
              }}
                style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr', padding: '12px 14px',
                  borderBottom: `1px solid ${T.border}`,
                  cursor: (m.status === 'active' && !m.redeemed_this_week) ? 'pointer' : 'default',
                  fontSize: 13, color: T.text, transition: 'background 0.15s',
                  background: selected === m.id ? T.accent + '10' : 'transparent' }}
                onMouseEnter={e => { if (selected !== m.id) e.currentTarget.style.background = T.card; }}
                onMouseLeave={e => { if (selected !== m.id) e.currentTarget.style.background = 'transparent'; }}>
                <div style={{ fontWeight: 600 }}>{m.name}</div>
                <div style={{ color: T.textDim }}>{m.phone || m.email || '-'}</div>
                <div>
                  <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600,
                    background: m.status === 'active' ? T.green + '20' : T.red + '20',
                    color: m.status === 'active' ? T.green : T.red }}>
                    {m.status === 'active' ? 'Active' : m.status === 'inactive' ? 'Paused' : (m.status || 'Unknown')}
                  </span>
                </div>
                <div>
                  {m.status !== 'active' ? (
                    <span style={{ color: T.textDim }}>-</span>
                  ) : m.redeemed_this_week ? (
                    <span style={{ color: T.orange, fontWeight: 600, fontSize: 12 }}>Redeemed</span>
                  ) : (
                    <span style={{ color: T.green, fontWeight: 600, fontSize: 12 }}>Available</span>
                  )}
                </div>
              </div>
              {/* Drink picker row */}
              {selected === m.id && (
                <div style={{ padding: '10px 14px', background: T.card, borderBottom: `1px solid ${T.border}`,
                  display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  <span style={{ color: T.textDim, fontSize: 12, width: '100%', marginBottom: 4 }}>Select drink to redeem:</span>
                  {drinks.map(d => (
                    <button key={d} onClick={() => handleRedeem(m.id, d)}
                      style={{ padding: '6px 14px', background: T.accent + '20', color: T.accent,
                        border: `1px solid ${T.accent}50`, borderRadius: 20, cursor: 'pointer',
                        fontSize: 12, fontWeight: 600 }}>
                      {d}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
          {!filtered.length && (
            <div style={{ padding: 24, textAlign: 'center', color: T.textDim }}>
              {members.length ? 'No members match your search' : 'No Cha Club members yet'}
            </div>
          )}
        </div>
      )}
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
// REWARDS TAB
// ════════════════════════════════════════════════════════
function RewardsTab({ pin }) {
  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState(null);
  const [editPts, setEditPts] = useState(0);
  const [editDesc, setEditDesc] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newPts, setNewPts] = useState(10);
  const [newDesc, setNewDesc] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    getLoyaltyRewards(pin).then(d => {
      setRewards(d.rewards || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [pin]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(''), 3000);
    return () => clearTimeout(t);
  }, [msg]);

  const handleAdd = () => {
    if (!newDesc.trim()) return;
    setSaving(true);
    createLoyaltyReward(pin, { points_required: newPts, description: newDesc.trim() })
      .then(() => { setShowAdd(false); setNewPts(10); setNewDesc(''); setMsg('Reward created'); load(); })
      .catch(e => setMsg(e.message))
      .finally(() => setSaving(false));
  };

  const handleSave = (id) => {
    setSaving(true);
    updateLoyaltyReward(pin, id, { points_required: editPts, description: editDesc })
      .then(() => { setEditId(null); setMsg('Reward updated'); load(); })
      .catch(e => setMsg(e.message))
      .finally(() => setSaving(false));
  };

  const handleToggleActive = (r) => {
    updateLoyaltyReward(pin, r.id, { active: !r.active })
      .then(() => { setMsg(r.active ? 'Reward disabled' : 'Reward enabled'); load(); });
  };

  const handleDelete = (r) => {
    if (!confirm(`Delete "${r.description}"?`)) return;
    deleteLoyaltyReward(pin, r.id)
      .then(() => { setMsg('Reward deleted'); load(); });
  };

  const startEdit = (r) => {
    setEditId(r.id);
    setEditPts(r.points_required);
    setEditDesc(r.description);
  };

  const inputStyle = { padding: 8, background: T.bg, color: T.text,
    border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 13, outline: 'none' };

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
        <Stat label="Total Rewards" value={rewards.length} />
        <Stat label="Active" value={rewards.filter(r => r.active).length} color={T.green} />
        <button onClick={() => setShowAdd(true)}
          style={{ marginLeft: 'auto', padding: '8px 18px', background: T.accent, color: '#000',
            border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>
          + Add Reward
        </button>
      </div>

      {msg && <div style={{ padding: 10, background: T.green + '20', color: T.green,
        borderRadius: 8, marginBottom: 12, fontSize: 13, fontWeight: 600 }}>{msg}</div>}

      {/* Add reward inline form */}
      {showAdd && (
        <div style={{ background: T.card, borderRadius: 10, padding: 16, marginBottom: 16,
          border: `1px solid ${T.accent}40`, display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <label style={{ color: T.textDim, fontSize: 11, display: 'block', marginBottom: 4 }}>Points Required</label>
            <input type="number" value={newPts} onChange={e => setNewPts(parseInt(e.target.value) || 0)}
              style={{ ...inputStyle, width: 80 }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ color: T.textDim, fontSize: 11, display: 'block', marginBottom: 4 }}>Description</label>
            <input value={newDesc} onChange={e => setNewDesc(e.target.value)}
              placeholder="e.g. Free Entree"
              style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
          </div>
          <button onClick={handleAdd} disabled={saving}
            style={{ padding: '8px 16px', background: T.green, color: '#fff', border: 'none',
              borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13,
              opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Saving...' : 'Create'}
          </button>
          <button onClick={() => setShowAdd(false)}
            style={{ padding: '8px 16px', background: 'transparent', color: T.textDim,
              border: `1px solid ${T.border}`, borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>
            Cancel
          </button>
        </div>
      )}

      {loading ? (
        <p style={{ color: T.textDim, textAlign: 'center' }}>Loading rewards...</p>
      ) : (
        <div style={{ background: T.bg, borderRadius: 10, border: `1px solid ${T.border}`, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 100px 180px', padding: '10px 14px',
            background: T.border, fontSize: 12, color: T.textDim, fontWeight: 600 }}>
            <div>Points</div><div>Reward</div><div>Status</div><div>Actions</div>
          </div>
          {rewards.map(r => (
            <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 100px 180px',
              padding: '12px 14px', borderBottom: `1px solid ${T.border}`, alignItems: 'center', fontSize: 13 }}>
              {editId === r.id ? (
                <>
                  <input type="number" value={editPts} onChange={e => setEditPts(parseInt(e.target.value) || 0)}
                    style={{ ...inputStyle, width: 60 }} />
                  <input value={editDesc} onChange={e => setEditDesc(e.target.value)}
                    style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', marginRight: 8 }} />
                  <div />
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => handleSave(r.id)} disabled={saving}
                      style={{ padding: '4px 10px', background: T.green, color: '#fff', border: 'none',
                        borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>Save</button>
                    <button onClick={() => setEditId(null)}
                      style={{ padding: '4px 10px', background: 'transparent', color: T.textDim,
                        border: `1px solid ${T.border}`, borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>Cancel</button>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ color: T.accent, fontWeight: 700 }}>{r.points_required}</div>
                  <div style={{ color: T.text }}>{r.description}</div>
                  <div>
                    <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600,
                      background: r.active ? T.green + '20' : T.red + '20',
                      color: r.active ? T.green : T.red }}>
                      {r.active ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => startEdit(r)}
                      style={{ padding: '4px 10px', background: T.accent + '20', color: T.accent,
                        border: `1px solid ${T.accent}40`, borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>Edit</button>
                    <button onClick={() => handleToggleActive(r)}
                      style={{ padding: '4px 10px', background: r.active ? T.orange + '20' : T.green + '20',
                        color: r.active ? T.orange : T.green,
                        border: `1px solid ${r.active ? T.orange : T.green}40`, borderRadius: 4,
                        cursor: 'pointer', fontSize: 12 }}>
                      {r.active ? 'Disable' : 'Enable'}
                    </button>
                    <button onClick={() => handleDelete(r)}
                      style={{ padding: '4px 10px', background: T.red + '20', color: T.red,
                        border: `1px solid ${T.red}40`, borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>Del</button>
                  </div>
                </>
              )}
            </div>
          ))}
          {!rewards.length && (
            <div style={{ padding: 24, textAlign: 'center', color: T.textDim }}>
              No rewards configured yet — add one to let customers redeem loyalty points
            </div>
          )}
        </div>
      )}
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
            <TabBtn label="Rewards" active={tab === 'rewards'} onClick={() => setTab('rewards')} />
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
        {tab === 'rewards' && <RewardsTab pin={pin} />}
        {tab === 'crm' && <CRMTab pin={pin} />}
      </div>
    </div>
  );
}
