import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext.jsx';
import { Stagger, StaggerItem, FadeIn } from '../components/motion.jsx';

const EASE = [0.22, 1, 0.36, 1];

export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="stack-6">
      {/* ── Hero ── */}
      <section className="hero-grid">
        <div className="stack" style={{ maxWidth: 560 }}>
          <motion.p
            className="eyebrow"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
          >
            For Kenyan Gen&nbsp;Z
          </motion.p>

          <h1 className="display" style={{ margin: 0 }}>
            {['Earn', 'from', 'a', 'skill.'].map((w, i) => (
              <motion.span
                key={i}
                style={{ display: 'inline-block', marginRight: '0.28em' }}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: EASE, delay: 0.05 + i * 0.06 }}
              >
                {w}
              </motion.span>
            ))}
            <br />
            <motion.span
              style={{ color: 'var(--brand-strong)' }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: EASE, delay: 0.34 }}
            >
              Hire with confidence.
            </motion.span>
          </h1>

          <motion.p
            className="muted"
            style={{ fontSize: 'var(--fs-md)', margin: 0 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            List a digital skill or a physical item for hire, agree a price, and let{' '}
            <strong style={{ color: 'var(--text)' }}>HustleGuard</strong> hold the payment
            in M-Pesa escrow until the job is done. Chat stays end-to-end encrypted the
            whole way.
          </motion.p>

          <motion.div
            className="row"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: EASE, delay: 0.5 }}
          >
            <Link to="/browse" className="btn btn-primary btn-lg">
              Browse listings
            </Link>
            <Link to={user ? '/listings/new' : '/register'} className="btn btn-ghost btn-lg">
              {user ? 'Post a listing' : 'Create an account'}
            </Link>
          </motion.div>
        </div>

        <EscrowFlow />
      </section>

      {/* ── Features ── */}
      <Stagger className="grid-listings" gap={0.08}>
        {FEATURES.map((f) => (
          <StaggerItem key={f.title}>
            <div className="card card-hover stack-2" style={{ height: '100%' }}>
              <span style={featIcon}>{f.icon}</span>
              <h3 style={{ margin: 0 }}>{f.title}</h3>
              <p className="muted" style={{ margin: 0, fontSize: 'var(--fs-sm)' }}>
                {f.body}
              </p>
            </div>
          </StaggerItem>
        ))}
      </Stagger>

      {/* ── How it works ── */}
      <FadeIn>
        <div className="card stack" style={{ padding: 'var(--sp-7)' }}>
          <h2 style={{ margin: 0 }}>How a hire works</h2>
          <div style={steps.wrap}>
            {STEPS.map((s, i) => (
              <div key={i} style={steps.item}>
                <span style={steps.num}>{i + 1}</span>
                <div>
                  <strong>{s.t}</strong>
                  <p className="muted" style={{ margin: '2px 0 0', fontSize: 'var(--fs-sm)' }}>
                    {s.d}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </FadeIn>
    </div>
  );
}

/* Animated Client → Escrow → Provider diagram. */
function EscrowFlow() {
  return (
    <motion.div
      className="card"
      style={flow.card}
      initial={{ opacity: 0, scale: 0.94, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.6, ease: EASE, delay: 0.2 }}
    >
      <div className="row-between" style={{ marginBottom: 6 }}>
        <span className="eyebrow" style={{ color: 'var(--text-dim)' }}>HustleGuard escrow</span>
        <span className="badge badge-ok">Funds Secured</span>
      </div>

      <div style={flow.rail}>
        <Node label="Client" sub="pays in" />
        <div style={flow.track}>
          <motion.span
            style={flow.dot}
            animate={{ left: ['4%', '92%', '4%'] }}
            transition={{ duration: 3.4, ease: 'easeInOut', repeat: Infinity }}
          />
        </div>
        <Node label="Escrow" sub="holds it" accent />
        <div style={flow.track}>
          <motion.span
            style={{ ...flow.dot, background: 'var(--ok)' }}
            animate={{ left: ['4%', '92%'] }}
            transition={{ duration: 1.6, ease: 'easeInOut', repeat: Infinity, repeatDelay: 2.6 }}
          />
        </div>
        <Node label="Provider" sub="gets paid" />
      </div>

      <p className="muted" style={{ margin: '14px 0 0', fontSize: 'var(--fs-xs)' }}>
        Money only moves to the provider once the client taps <strong>Approve delivery</strong>.
        Neither side has to trust the other — they trust the escrow.
      </p>
    </motion.div>
  );
}

function Node({ label, sub, accent }) {
  return (
    <div style={{ textAlign: 'center', minWidth: 64 }}>
      <div
        style={{
          width: 44,
          height: 44,
          margin: '0 auto 6px',
          borderRadius: 'var(--r-md)',
          display: 'grid',
          placeItems: 'center',
          background: accent ? 'var(--brand)' : 'var(--surface-2)',
          color: accent ? 'var(--brand-contrast)' : 'var(--text-dim)',
          border: '1px solid var(--border)',
          fontWeight: 800,
        }}
      >
        {accent ? '🔒' : label[0]}
      </div>
      <div style={{ fontSize: 'var(--fs-xs)', fontWeight: 700 }}>{label}</div>
      <div className="faint" style={{ fontSize: '0.68rem' }}>{sub}</div>
    </div>
  );
}

const svg = (d) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {d}
  </svg>
);

const FEATURES = [
  {
    title: 'One place for skills and gear',
    body: 'Tutoring, photography, design — and the camera, keyboard or PA speakers to go with them.',
    icon: svg(<><rect x="3" y="4" width="18" height="14" rx="2" /><path d="M8 21h8M12 18v3" /></>),
  },
  {
    title: 'HustleGuard M-Pesa escrow',
    body: 'The client pays into escrow with an STK Push. Funds only release when they approve delivery.',
    icon: svg(<><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M9 7h6M12 12l2 2 4-4" /></>),
  },
  {
    title: 'Private by default',
    body: 'Every chat is end-to-end encrypted, so booking details and phone numbers stay between the two of you.',
    icon: svg(<><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>),
  },
];

const STEPS = [
  { t: 'Post or find a listing', d: 'Browse by category, price and location, or list your own skill or gear with photos.' },
  { t: 'Hire & pay to escrow', d: 'An M-Pesa STK Push holds the fee plus a small platform fee. Status: Funds Secured.' },
  { t: 'Approve & release', d: 'Once the work or item is delivered, approve it — the provider is paid instantly via M-Pesa.' },
];

const featIcon = {
  display: 'inline-grid',
  placeItems: 'center',
  width: 40,
  height: 40,
  borderRadius: 'var(--r-md)',
  background: 'var(--brand-soft)',
  color: 'var(--brand-strong)',
};
const flow = {
  card: { background: 'var(--surface)' },
  rail: { display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 },
  track: {
    position: 'relative',
    flex: 1,
    height: 3,
    borderRadius: 3,
    background: 'var(--surface-3)',
    minWidth: 24,
  },
  dot: {
    position: 'absolute',
    top: '50%',
    width: 9,
    height: 9,
    marginTop: -4.5,
    borderRadius: '50%',
    background: 'var(--brand)',
  },
};
const steps = {
  wrap: { display: 'grid', gap: 'var(--sp-4)', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginTop: 'var(--sp-2)' },
  item: { display: 'flex', gap: 'var(--sp-3)', alignItems: 'flex-start' },
  num: {
    flexShrink: 0,
    width: 26,
    height: 26,
    borderRadius: 'var(--r-full)',
    background: 'var(--brand-soft)',
    color: 'var(--brand-strong)',
    display: 'grid',
    placeItems: 'center',
    fontWeight: 800,
    fontSize: 'var(--fs-xs)',
  },
};
