import { useState } from "react";
import { Link } from "react-router-dom";

const THEME = {
  bg: "#1a1210", card: "#2a1f1a", accent: "#d4a843",
  text: "#f5f0e8", textSecondary: "#a89880",
};

const DRINK_CLUB_LINK = import.meta.env.VITE_DRINK_CLUB_LINK || "https://buy.stripe.com/4gMcMY3UhfAj6ri96S5Vu00";

const FAQS = [
  { q: "How does it work?", a: "Subscribe for $14.99/month. Each week (Monday-Sunday), you can redeem one specialty drink at Thai House. Just show your name or QR code to staff." },
  { q: "When does my week reset?", a: "Every Monday at 10:00 AM Pacific Time. You get one drink per week." },
  { q: "Can I roll over unused drinks?", a: "No, each week is use-it-or-lose-it. One drink per week keeps it simple and valuable." },
  { q: "How do I cancel?", a: "You can cancel anytime through the member portal. Your subscription stays active through the end of the billing period." },
  { q: "Which drinks are included?", a: "All specialty drinks on our menu including Thai Iced Tea, Thai Iced Coffee, specialty fruit juices, and more. Ask your server for this week's featured drink!" },
];

export default function DrinkClubPage() {
  const [openFaq, setOpenFaq] = useState(null);

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <Link to="/thaihouse" style={{ color: THEME.textSecondary, textDecoration: "none", fontSize: 14 }}>
          &larr; Back to Menu
        </Link>
        <h1 style={{ color: THEME.accent, fontSize: 32, margin: "16px 0 4px", fontWeight: 700 }}>
          Thai House Drink Club
        </h1>
        <p style={{ color: THEME.textSecondary, margin: 0, fontSize: 16 }}>
          Your weekly specialty drink, on us.
        </p>
      </header>

      {/* Value Prop */}
      <div style={styles.heroCard}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>&#9749;</div>
        <div style={{ fontSize: 36, fontWeight: 800, color: THEME.accent, marginBottom: 4 }}>
          $14.99<span style={{ fontSize: 16, fontWeight: 400 }}>/month</span>
        </div>
        <p style={{ color: THEME.text, fontSize: 18, margin: "8px 0" }}>
          1 specialty drink every week
        </p>
      </div>

      {/* How it Works */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>How It Works</h2>
        <div style={styles.steps}>
          {[
            { num: "1", icon: "\ud83d\udcf3", title: "Subscribe", desc: "Sign up for $14.99/month" },
            { num: "2", icon: "\ud83c\udfea", title: "Visit", desc: "Come to Thai House any day" },
            { num: "3", icon: "\u2615", title: "Enjoy", desc: "Show your name or QR to redeem" },
          ].map((step) => (
            <div key={step.num} style={styles.stepCard}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{step.icon}</div>
              <div style={{ fontWeight: 700, color: THEME.text, marginBottom: 4 }}>{step.title}</div>
              <div style={{ color: THEME.textSecondary, fontSize: 13 }}>{step.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Subscribe CTA */}
      <div style={{ padding: "0 24px", marginBottom: 32 }}>
        <a
          href={DRINK_CLUB_LINK}
          target="_blank"
          rel="noopener noreferrer"
          style={{ ...styles.primaryBtn, display: "block", textAlign: "center", textDecoration: "none" }}
        >
          Subscribe &mdash; $14.99/month
        </a>
      </div>

      {/* Already a member? */}
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <Link to="/thaihouse/drinks/member" style={{ color: THEME.accent, fontSize: 14 }}>
          Already a member? Check your status &rarr;
        </Link>
      </div>

      {/* FAQ */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>FAQ</h2>
        {FAQS.map((faq, i) => (
          <div key={i} style={styles.faqItem}>
            <button
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
              style={styles.faqQuestion}
            >
              <span>{faq.q}</span>
              <span style={{ color: THEME.accent }}>{openFaq === i ? "-" : "+"}</span>
            </button>
            {openFaq === i && (
              <div style={styles.faqAnswer}>{faq.a}</div>
            )}
          </div>
        ))}
      </div>

      <footer style={{ textAlign: "center", padding: "40px 16px 24px" }}>
        <a href="https://playgmg.com" target="_blank" rel="noopener noreferrer"
           style={{ color: THEME.textSecondary, textDecoration: "none", fontSize: 12 }}>
          Powered by GameMaster Guide
        </a>
      </footer>
    </div>
  );
}

const styles = {
  page: {
    background: THEME.bg, minHeight: "100vh", color: THEME.text,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  header: { textAlign: "center", padding: "24px 16px 16px" },
  heroCard: {
    margin: "0 24px 24px", padding: "32px 24px", background: THEME.card,
    borderRadius: 16, textAlign: "center", border: `1.5px solid ${THEME.accent}`,
  },
  section: { padding: "0 24px", marginBottom: 32 },
  sectionTitle: { color: THEME.accent, fontSize: 22, fontWeight: 700, marginBottom: 16 },
  steps: { display: "flex", gap: 12 },
  stepCard: {
    flex: 1, padding: "20px 12px", background: THEME.card,
    borderRadius: 12, textAlign: "center",
  },
  primaryBtn: {
    padding: "16px 28px", borderRadius: 12, border: "none",
    background: THEME.accent, color: THEME.bg, fontWeight: 700, fontSize: 18, cursor: "pointer",
  },
  faqItem: {
    borderBottom: `1px solid ${THEME.textSecondary}30`, marginBottom: 2,
  },
  faqQuestion: {
    width: "100%", padding: "14px 0", background: "none", border: "none",
    color: THEME.text, fontSize: 15, fontWeight: 600, cursor: "pointer",
    display: "flex", justifyContent: "space-between", alignItems: "center", textAlign: "left",
  },
  faqAnswer: {
    color: THEME.textSecondary, fontSize: 14, padding: "0 0 14px", lineHeight: 1.5,
  },
};
