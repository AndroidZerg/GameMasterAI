import { useState, useEffect } from "react";
import { API_BASE } from "../../services/api";
import { sectionCard } from "./OverviewSection";

export default function LeadsSection({ token, refreshKey }) {
  const [activeTab, setActiveTab] = useState("contacts");
  const [contacts, setContacts] = useState([]);
  const [signups, setSignups] = useState([]);

  useEffect(() => {
    if (!token) return;
    // Fetch contact form submissions (try admin inquiries endpoint)
    fetch(`${API_BASE}/api/contact/list`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setContacts(Array.isArray(data) ? data : data?.contacts || []))
      .catch(() => setContacts([]));

    // Fetch convention signups
    fetch(`${API_BASE}/api/v1/analytics/convention-signups`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.ok ? r.json() : { signups: [] })
      .then((data) => setSignups(data.signups || []))
      .catch(() => setSignups([]));
  }, [token, refreshKey]);

  const tabStyle = (active) => ({
    padding: "8px 20px", borderRadius: "8px 8px 0 0", border: "1px solid #334155",
    borderBottom: active ? "none" : "1px solid #334155",
    background: active ? "#1e293b" : "#0f172a", color: active ? "#e2e8f0" : "#64748b",
    cursor: "pointer", fontSize: "0.85rem", fontWeight: active ? 600 : 400,
  });

  return (
    <div>
      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 0 }}>
        <button onClick={() => setActiveTab("contacts")} style={tabStyle(activeTab === "contacts")}>Contact Form Leads</button>
        <button onClick={() => setActiveTab("convention")} style={tabStyle(activeTab === "convention")}>Convention Signups</button>
      </div>

      {activeTab === "contacts" && (
        <div style={{ ...sectionCard, borderTopLeftRadius: 0, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #334155" }}>
                {["Date", "Name", "Email", "Venue", "Message", "Source"].map((h) => (
                  <th key={h} style={{ padding: "8px 10px", textAlign: "left", color: "#64748b", fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {contacts.length === 0 && (
                <tr><td colSpan={6} style={{ padding: 16, textAlign: "center", color: "#475569" }}>No contact form submissions yet</td></tr>
              )}
              {contacts.map((c, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #1e293b" }}>
                  <td style={{ padding: "8px 10px", color: "#94a3b8", whiteSpace: "nowrap" }}>{c.created_at ? new Date(c.created_at).toLocaleDateString() : c.date || "—"}</td>
                  <td style={{ padding: "8px 10px", color: "#e2e8f0" }}>{c.name || "—"}</td>
                  <td style={{ padding: "8px 10px", color: "#94a3b8" }}>{c.email || "—"}</td>
                  <td style={{ padding: "8px 10px", color: "#94a3b8" }}>{c.venue || c.venue_name || "—"}</td>
                  <td style={{ padding: "8px 10px", color: "#94a3b8", maxWidth: 250, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={c.message}>{c.message || "—"}</td>
                  <td style={{ padding: "8px 10px", color: "#64748b" }}>{c.source || "contact_form"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "convention" && (
        <div style={{ ...sectionCard, borderTopLeftRadius: 0, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #334155" }}>
                {["Email", "Signup Date", "Sessions", "Last Active", "Expires"].map((h) => (
                  <th key={h} style={{ padding: "8px 10px", textAlign: "left", color: "#64748b", fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {signups.length === 0 && (
                <tr><td colSpan={5} style={{ padding: 16, textAlign: "center", color: "#475569" }}>No convention signups yet</td></tr>
              )}
              {signups.map((s, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #1e293b" }}>
                  <td style={{ padding: "8px 10px", color: "#e2e8f0" }}>{s.email}</td>
                  <td style={{ padding: "8px 10px", color: "#94a3b8", whiteSpace: "nowrap" }}>{s.signup_date ? new Date(s.signup_date).toLocaleDateString() : "—"}</td>
                  <td style={{ padding: "8px 10px", color: "#94a3b8" }}>{s.sessions}</td>
                  <td style={{ padding: "8px 10px", color: "#94a3b8", whiteSpace: "nowrap" }}>{s.last_active ? new Date(s.last_active).toLocaleDateString() : "—"}</td>
                  <td style={{ padding: "8px 10px", color: "#94a3b8", whiteSpace: "nowrap" }}>{s.expires ? new Date(s.expires).toLocaleDateString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
