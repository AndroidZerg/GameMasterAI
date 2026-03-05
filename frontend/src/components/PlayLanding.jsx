import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { guestAuth } from '../services/api';
import EventTracker from '../services/EventTracker';

/**
 * /play — QR code landing page for venue tables.
 * URL: /play?venue=shallweplay&table=6
 *
 * Flow:
 * 1. Read venue (required) and table (optional) from query params
 * 2. Call GET /api/auth/guest?venue=X&table=Y to get a guest JWT
 * 3. Auto-login via AuthContext
 * 4. Track qr_scan analytics event
 * 5. Redirect to /games
 */
export default function PlayLanding() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [status, setStatus] = useState('Connecting...');
  const [error, setError] = useState(null);
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;

    const venue = searchParams.get('venue');
    const table = searchParams.get('table');

    if (!venue) {
      setError('Missing venue parameter. Please scan the QR code at your table.');
      return;
    }

    async function initGuestSession() {
      try {
        const data = await guestAuth(venue, table);

        // Auto-login as guest
        login(
          data.token,
          data.venue_id,
          data.venue_name,
          data.role || 'guest',
          data.status || 'active',
          data.expires_at || null,
        );

        // Store table number for analytics
        if (table) {
          sessionStorage.setItem('gmg_table_number', table);
        }

        // Track QR scan event
        EventTracker.setVenue(data.venue_id);
        EventTracker.track('qr_scan', null, {
          venue: data.venue_id,
          venue_slug: venue,
          table: table || null,
        });

        setStatus('Welcome! Loading games...');
        setTimeout(() => navigate('/games', { replace: true }), 800);
      } catch (err) {
        console.error('Guest auth failed:', err);
        if (err.message?.includes('Unknown venue')) {
          setError(`We couldn't find a venue matching "${venue}". Please check the QR code and try again.`);
        } else {
          setError('Something went wrong. Please try scanning the QR code again.');
        }
      }
    }

    initGuestSession();
  }, [searchParams, navigate, login]);

  if (error) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: '100vh', color: 'white',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        padding: '2rem', textAlign: 'center',
      }}>
        <div style={{
          width: '64px', height: '64px', borderRadius: '16px',
          background: '#e94560', margin: '0 auto 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.8rem',
        }}>
          {"\u26A0\uFE0F"}
        </div>
        <h1 style={{ fontSize: '1.6rem', marginBottom: '1rem', fontWeight: 800 }}>
          Oops!
        </h1>
        <p style={{ fontSize: '1.1rem', opacity: 0.85, maxWidth: '400px', lineHeight: 1.5 }}>
          {error}
        </p>
        <button
          onClick={() => navigate('/', { replace: true })}
          style={{
            marginTop: '2rem', padding: '12px 28px', borderRadius: '8px',
            border: 'none', background: '#e94560', color: 'white',
            fontSize: '1rem', fontWeight: 600, cursor: 'pointer',
          }}
        >
          Go Home
        </button>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100vh', color: 'white',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    }}>
      <img src="/gmg-logo.svg" alt="GameMaster Guide" style={{ width: '120px', marginBottom: '1rem' }} />
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem', fontWeight: 800 }}>GameMaster Guide</h1>
      <p style={{ fontSize: '1.2rem', opacity: 0.8 }}>{status}</p>
      <div style={{
        width: '24px', height: '24px', marginTop: '16px',
        border: '3px solid rgba(255,255,255,0.2)',
        borderTopColor: '#fff', borderRadius: '50%',
        animation: 'spinnerRotate 0.6s linear infinite',
      }} />
    </div>
  );
}
