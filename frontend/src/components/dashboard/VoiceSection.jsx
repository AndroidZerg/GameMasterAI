import { useState, useEffect } from "react";
import { API_BASE } from "../../services/api";
import { MetricCard, DonutChart, HorizontalBars, sectionCard } from "./OverviewSection";

function useFetch(path, { venueId, startDate, endDate, token, refreshKey }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    if (!token) return;
    const params = new URLSearchParams();
    if (venueId) params.set("venue_id", venueId);
    if (startDate) params.set("start_date", startDate);
    if (endDate) params.set("end_date", endDate);
    fetch(`${API_BASE}${path}?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.ok ? r.json() : null)
      .then(setData)
      .catch(() => setData(null));
  }, [path, venueId, startDate, endDate, token, refreshKey]);
  return data;
}

export default function VoiceSection({ venueId, startDate, endDate, token, refreshKey }) {
  const fp = { venueId, startDate, endDate, token, refreshKey };

  const inputMethods = useFetch("/api/v1/analytics/input-methods", fp);
  const ttsByTab = useFetch("/api/v1/analytics/tts-by-tab", fp);
  const summary = useFetch("/api/v1/analytics/summary", fp);

  const voice = inputMethods?.voice || 0;
  const text = inputMethods?.text || 0;
  const totalInputs = voice + text || 1;
  const voicePct = Math.round((voice / totalInputs) * 100);

  // TTS totals from tab data
  const tabs = ttsByTab?.tabs || [];
  const totalTTS = tabs.reduce((s, t) => s + t.play_count, 0);
  const avgListenDuration = tabs.length > 0
    ? (tabs.reduce((s, t) => s + (t.avg_duration_seconds * t.play_count), 0) / Math.max(totalTTS, 1)).toFixed(1)
    : 0;

  return (
    <div>
      {/* Summary cards */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        <MetricCard label="Total TTS Plays" value={totalTTS} />
        <MetricCard label="Total Voice Inputs" value={voice} />
        <MetricCard label="Avg Listen Duration" value={`${avgListenDuration}s`} />
        <MetricCard label="Voice Question %" value={`${voicePct}%`} />
      </div>

      {/* Row: Voice vs Text donut + TTS by Tab */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        {/* Voice vs Text */}
        <div style={{ ...sectionCard, flex: "1 1 320px", minWidth: 280 }}>
          <h3 style={{ fontSize: "0.9rem", color: "#94a3b8", margin: "0 0 12px" }}>Voice vs Text Input</h3>
          <DonutChart
            segments={[
              { label: "Voice", count: voice },
              { label: "Text", count: text },
            ]}
            size={160}
          />
        </div>

        {/* TTS by Tab */}
        <div style={{ ...sectionCard, flex: "1 1 320px", minWidth: 280 }}>
          <h3 style={{ fontSize: "0.9rem", color: "#94a3b8", margin: "0 0 12px" }}>TTS by Tab</h3>
          {tabs.length === 0 ? (
            <div style={{ color: "#475569", fontSize: "0.85rem" }}>No TTS usage recorded</div>
          ) : (
            <div>
              {tabs.map((t, i) => {
                const maxCount = Math.max(...tabs.map((tb) => tb.play_count), 1);
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <div style={{ width: 80, fontSize: "0.8rem", color: "#94a3b8", textAlign: "right" }}>{t.tab}</div>
                    <div style={{ flex: 1, height: 22, background: "#0f172a", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{
                        height: "100%", width: `${(t.play_count / maxCount) * 100}%`,
                        background: "#3b82f6", borderRadius: 4, minWidth: t.play_count > 0 ? 4 : 0,
                      }} />
                    </div>
                    <div style={{ width: 40, fontSize: "0.75rem", color: "#cbd5e1", textAlign: "right" }}>{t.play_count}</div>
                    <div style={{ width: 50, fontSize: "0.7rem", color: "#64748b" }}>avg {t.avg_duration_seconds}s</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* TTS Completion + Voice Success */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        <div style={sectionCard}>
          <h3 style={{ fontSize: "0.9rem", color: "#94a3b8", margin: "0 0 8px" }}>TTS Completion Rate</h3>
          <div style={{ fontSize: "0.85rem", color: "#94a3b8" }}>
            Requires tts_completed events for full completion tracking.
          </div>
        </div>
        <div style={sectionCard}>
          <h3 style={{ fontSize: "0.9rem", color: "#94a3b8", margin: "0 0 8px" }}>Voice Input Success Rate</h3>
          <div style={{ fontSize: "0.85rem", color: "#94a3b8" }}>
            Requires voice_input_used success field for accuracy metrics.
          </div>
        </div>
      </div>
    </div>
  );
}
