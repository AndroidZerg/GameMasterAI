import { useState } from "react";

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const DAY_LABELS = { mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday" };
const HOURS = Array.from({ length: 24 }, (_, i) => {
  const h = i % 12 || 12;
  const ampm = i < 12 ? "AM" : "PM";
  return `${h}:00 ${ampm}`;
});

export default function StepVenueInfo({ data, onSave }) {
  const [form, setForm] = useState({
    venue_name: data.venue_name || "",
    address: data.address || "",
    city: data.city || "",
    state: data.state || "",
    zip_code: data.zip_code || "",
    phone: data.phone || "",
    contact_name: data.contact_name || "",
  });
  const [hours, setHours] = useState(() => {
    const h = data.hours_json || {};
    const result = {};
    DAYS.forEach(d => {
      if (h[d] === "closed" || !h[d]) {
        result[d] = { closed: !h[d] || h[d] === "closed", open: "10:00 AM", close: "10:00 PM" };
      } else {
        const [o, c] = h[d].split("-");
        result[d] = { closed: false, open: formatTime(o), close: formatTime(c) };
      }
    });
    return result;
  });
  const [saving, setSaving] = useState(false);

  function formatTime(t) {
    if (!t) return "10:00 AM";
    const [hh] = t.split(":");
    const h = parseInt(hh, 10);
    const ampm = h < 12 ? "AM" : "PM";
    const display = h % 12 || 12;
    return `${display}:00 ${ampm}`;
  }

  function parseTime(display) {
    const match = display.match(/^(\d+):00\s*(AM|PM)$/i);
    if (!match) return "10:00";
    let h = parseInt(match[1], 10);
    if (match[2].toUpperCase() === "PM" && h !== 12) h += 12;
    if (match[2].toUpperCase() === "AM" && h === 12) h = 0;
    return `${h.toString().padStart(2, "0")}:00`;
  }

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleHourChange = (day, field, val) => {
    setHours({ ...hours, [day]: { ...hours[day], [field]: val } });
  };

  const toggleClosed = (day) => {
    setHours({ ...hours, [day]: { ...hours[day], closed: !hours[day].closed } });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const hours_json = {};
    DAYS.forEach(d => {
      if (hours[d].closed) {
        hours_json[d] = "closed";
      } else {
        hours_json[d] = `${parseTime(hours[d].open)}-${parseTime(hours[d].close)}`;
      }
    });
    await onSave({ ...form, hours_json });
    setSaving(false);
  };

  const inputStyle = {
    width: "100%", padding: "10px 12px", background: "#1a2332",
    border: "1px solid #2a3a4a", borderRadius: 8, color: "#fff",
    fontSize: 14, outline: "none",
  };
  const labelStyle = { display: "block", marginBottom: 4, color: "#8899aa", fontSize: 13 };

  return (
    <form onSubmit={handleSubmit}>
      <h2 style={{ color: "#fff", marginBottom: 20 }}>Venue Information</h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={labelStyle}>Venue Name *</label>
          <input name="venue_name" value={form.venue_name} onChange={handleChange} required style={inputStyle} />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={labelStyle}>Address</label>
          <input name="address" value={form.address} onChange={handleChange} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>City</label>
          <input name="city" value={form.city} onChange={handleChange} style={inputStyle} />
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>State</label>
            <input name="state" value={form.state} onChange={handleChange} style={inputStyle} maxLength={2} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>ZIP</label>
            <input name="zip_code" value={form.zip_code} onChange={handleChange} style={inputStyle} />
          </div>
        </div>
        <div>
          <label style={labelStyle}>Phone</label>
          <input name="phone" value={form.phone} onChange={handleChange} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Contact Name</label>
          <input name="contact_name" value={form.contact_name} onChange={handleChange} style={inputStyle} />
        </div>
      </div>

      <h3 style={{ color: "#fff", marginBottom: 12 }}>Hours of Operation</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
        {DAYS.map(day => (
          <div key={day} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: "1px solid #1a2332" }}>
            <span style={{ width: 90, color: "#ccc", fontSize: 14 }}>{DAY_LABELS[day]}</span>
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", minWidth: 80 }}>
              <input type="checkbox" checked={hours[day].closed} onChange={() => toggleClosed(day)} />
              <span style={{ color: "#888", fontSize: 13 }}>Closed</span>
            </label>
            {!hours[day].closed && (
              <>
                <select value={hours[day].open} onChange={e => handleHourChange(day, "open", e.target.value)}
                  style={{ ...inputStyle, width: 120, padding: "6px 8px" }}>
                  {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
                <span style={{ color: "#666" }}>to</span>
                <select value={hours[day].close} onChange={e => handleHourChange(day, "close", e.target.value)}
                  style={{ ...inputStyle, width: 120, padding: "6px 8px" }}>
                  {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </>
            )}
          </div>
        ))}
      </div>

      <button type="submit" disabled={saving} style={{
        width: "100%", padding: "14px", background: "#e94560",
        color: "#fff", border: "none", borderRadius: 8, fontSize: 16,
        fontWeight: 600, cursor: saving ? "wait" : "pointer", opacity: saving ? 0.7 : 1,
      }}>
        {saving ? "Saving..." : "Save & Continue"}
      </button>
    </form>
  );
}
