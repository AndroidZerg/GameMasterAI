import { useState, useMemo } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { createPurchase } from "../../services/api";

const STRIPE_PK = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "";
const stripePromise = STRIPE_PK ? loadStripe(STRIPE_PK) : null;

const overlay = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 9000,
  display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
};
const modal = {
  background: "#1e293b", borderRadius: 16, padding: 24, width: "100%",
  maxWidth: 420, color: "#e2e8f0", border: "1px solid #334155",
  maxHeight: "90vh", overflowY: "auto",
};
const inputStyle = {
  width: "100%", padding: "10px 12px", borderRadius: 8,
  border: "1px solid #334155", background: "#0f172a", color: "#e2e8f0",
  fontSize: 14, boxSizing: "border-box",
};
const btnPrimary = {
  padding: "10px 24px", borderRadius: 8, border: "none",
  background: "#22c55e", color: "#fff", fontSize: 14, fontWeight: 700,
  cursor: "pointer", width: "100%",
};
const btnSecondary = {
  padding: "10px 24px", borderRadius: 8, border: "1px solid #334155",
  background: "transparent", color: "#94a3b8", fontSize: 14,
  cursor: "pointer", width: "100%",
};

function PaymentForm({ venueId, gameId, gameTitle, priceCents, email, name, onSuccess, onBack }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const priceStr = `$${(priceCents / 100).toFixed(2)}`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setProcessing(true);
    setError("");

    try {
      const { client_secret, purchase_id } = await createPurchase(venueId, gameId, email, name);

      const result = await stripe.confirmCardPayment(client_secret, {
        payment_method: { card: elements.getElement(CardElement) },
      });

      if (result.error) {
        setError(result.error.message || "Payment failed");
        setProcessing(false);
      } else if (result.paymentIntent?.status === "succeeded") {
        onSuccess(purchase_id);
      } else {
        setError("Unexpected payment status. Please try again.");
        setProcessing(false);
      }
    } catch (err) {
      setError(err.message || "Payment failed");
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <p style={{ fontSize: 13, color: "#94a3b8", marginBottom: 16 }}>
        Your card will be charged <strong style={{ color: "#e2e8f0" }}>{priceStr}</strong>
      </p>
      <div style={{
        padding: "12px", borderRadius: 8, border: "1px solid #334155",
        background: "#0f172a", marginBottom: 16,
      }}>
        <CardElement options={{
          style: {
            base: { fontSize: "16px", color: "#e2e8f0", "::placeholder": { color: "#64748b" } },
            invalid: { color: "#ef4444" },
          },
        }} />
      </div>
      {error && (
        <p style={{ color: "#ef4444", fontSize: 13, marginBottom: 12 }}>{error}</p>
      )}
      <div style={{ display: "flex", gap: 10 }}>
        <button type="button" onClick={onBack} style={btnSecondary} disabled={processing}>Back</button>
        <button type="submit" style={{ ...btnPrimary, opacity: processing ? 0.6 : 1 }} disabled={processing || !stripe}>
          {processing ? "Processing..." : `Pay ${priceStr}`}
        </button>
      </div>
    </form>
  );
}

export default function PurchaseModal({
  venueId, gameId, gameTitle, priceCents, complexity, playerCount, onClose, onPurchaseComplete,
}) {
  const [step, setStep] = useState(1); // 1=confirm, 2=info, 3=payment, 4=success
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [purchaseId, setPurchaseId] = useState("");

  const priceStr = `$${(priceCents / 100).toFixed(2)}`;

  const handleSuccess = (pid) => {
    setPurchaseId(pid);
    setStep(4);
    if (onPurchaseComplete) onPurchaseComplete();
  };

  const stripeOptions = useMemo(() => ({
    appearance: { theme: "night", variables: { colorPrimary: "#22c55e" } },
  }), []);

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={(e) => e.stopPropagation()}>
        {/* Step 1: Confirm */}
        {step === 1 && (
          <>
            <h3 style={{ margin: "0 0 16px", fontSize: "1.1rem", fontWeight: 700 }}>
              Buy {gameTitle}?
            </h3>
            <div style={{
              display: "flex", gap: 12, marginBottom: 16, padding: 12,
              background: "#0f172a", borderRadius: 8,
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: "#22c55e" }}>{priceStr}</div>
                {complexity && (
                  <span style={{
                    fontSize: 11, padding: "2px 8px", borderRadius: 12,
                    background: "#3b82f622", color: "#60a5fa", fontWeight: 600,
                  }}>
                    {complexity}
                  </span>
                )}
                {playerCount && (
                  <span style={{ fontSize: 12, color: "#94a3b8", marginLeft: 8 }}>
                    {playerCount.min}-{playerCount.max} players
                  </span>
                )}
              </div>
            </div>
            <p style={{ fontSize: 13, color: "#94a3b8", marginBottom: 16 }}>
              Purchase a physical copy to take home. A staff member will bring it to you after payment.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={onClose} style={btnSecondary}>Cancel</button>
              <button onClick={() => setStep(2)} style={btnPrimary}>Continue</button>
            </div>
          </>
        )}

        {/* Step 2: Customer info */}
        {step === 2 && (
          <>
            <h3 style={{ margin: "0 0 16px", fontSize: "1.1rem", fontWeight: 700 }}>
              Your Info
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 12, color: "#94a3b8", display: "block", marginBottom: 4 }}>
                  Email (for receipt) *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#94a3b8", display: "block", marginBottom: 4 }}>
                  Name (so staff can find you)
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Optional"
                  style={inputStyle}
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setStep(1)} style={btnSecondary}>Back</button>
              <button
                onClick={() => email.includes("@") && setStep(3)}
                style={{ ...btnPrimary, opacity: email.includes("@") ? 1 : 0.5 }}
                disabled={!email.includes("@")}
              >
                Continue
              </button>
            </div>
          </>
        )}

        {/* Step 3: Payment */}
        {step === 3 && stripePromise && (
          <>
            <h3 style={{ margin: "0 0 16px", fontSize: "1.1rem", fontWeight: 700 }}>
              Payment
            </h3>
            <Elements stripe={stripePromise} options={stripeOptions}>
              <PaymentForm
                venueId={venueId}
                gameId={gameId}
                gameTitle={gameTitle}
                priceCents={priceCents}
                email={email}
                name={name}
                onSuccess={handleSuccess}
                onBack={() => setStep(2)}
              />
            </Elements>
          </>
        )}

        {step === 3 && !stripePromise && (
          <p style={{ color: "#ef4444", fontSize: 13 }}>
            Payment is not configured. Please contact staff.
          </p>
        )}

        {/* Step 4: Success */}
        {step === 4 && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>&#10003;</div>
            <h3 style={{ margin: "0 0 8px", fontSize: "1.2rem", fontWeight: 700, color: "#22c55e" }}>
              Purchase Complete!
            </h3>
            <p style={{ fontSize: 14, color: "#94a3b8", marginBottom: 8 }}>
              Show this screen to a staff member to pick up your copy of
            </p>
            <p style={{ fontSize: 18, fontWeight: 700, color: "#e2e8f0", marginBottom: 16 }}>
              {gameTitle}
            </p>
            <div style={{
              display: "inline-block", padding: "6px 16px", borderRadius: 8,
              background: "#0f172a", fontSize: 13, color: "#64748b", marginBottom: 20,
            }}>
              Order ref: {purchaseId.slice(-6).toUpperCase()}
            </div>
            <br />
            <button onClick={onClose} style={{ ...btnPrimary, maxWidth: 200, margin: "0 auto" }}>
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
