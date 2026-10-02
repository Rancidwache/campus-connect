import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext.jsx';
import { FadeIn } from '../components/motion.jsx';

const EASE = [0.22, 1, 0.36, 1];
const QUICK = ['Photography', 'Tutoring', 'Graphic Design', 'Camera & Lenses', 'Audio & PA Gear'];

export default function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState('');

  const search = (e) => {
    e.preventDefault();
    const term = q.trim();
    navigate(term ? `/browse?q=${encodeURIComponent(term)}` : '/browse');
  };

  return (
    <div className="landing">
      {/* ── Hero ── */}
      <section className="landing-hero">
        <img className="landing-hero-img" src="/hero-students.jpg" alt="" />
        <div className="landing-hero-shade" />

        <div className="landing-hero-inner">
          <motion.h1
            className="landing-title"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
          >
            Earn from a skill.
            <br />
            Hire with confidence.
          </motion.h1>

          <motion.p
            className="landing-sub"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            Skills, gigs and gear from Kenyan students and creators. Payments held in M-Pesa escrow until you approve.
          </motion.p>

          <motion.form
            className="landing-search"
            onSubmit={search}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: EASE, delay: 0.25 }}
            role="search"
          >
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search for any skill or gear…"
              aria-label="Search listings"
            />
            <button type="submit" aria-label="Search">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
            </button>
          </motion.form>

          <motion.div
            className="landing-quick"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            {QUICK.map((c) => (
              <Link key={c} to={`/browse?category=${encodeURIComponent(c)}`}>
                {c}
              </Link>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Why ── */}
      <FadeIn>
        <section className="landing-cols">
          {FEATURES.map((f) => (
            <div key={f.title}>
              <h3>{f.title}</h3>
              <p className="muted">{f.body}</p>
            </div>
          ))}
        </section>
      </FadeIn>

      {/* ── How it works ── */}
      <FadeIn>
        <section className="landing-steps">
          <h2>How a hire works</h2>
          <ol>
            {STEPS.map((s, i) => (
              <li key={s.t}>
                <span>{i + 1}</span>
                <div>
                  <strong>{s.t}</strong>
                  <p className="muted">{s.d}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="row" style={{ marginTop: 'var(--sp-6)' }}>
            <Link to="/browse" className="btn btn-primary btn-lg">
              Browse listings
            </Link>
            <Link to={user ? '/listings/new' : '/register'} className="btn btn-ghost btn-lg">
              {user ? 'Post a listing' : 'Create an account'}
            </Link>
          </div>
        </section>
      </FadeIn>
    </div>
  );
}

const FEATURES = [
  { title: 'Skills and gear, one place', body: 'Tutoring, photography, design, and the camera or PA speakers to go with them.' },
  { title: 'Escrow on every hire', body: 'Your M-Pesa payment is held until you approve delivery. Disputes go to a moderator.' },
  { title: 'Private by default', body: 'Chats are end-to-end encrypted, so phone numbers and booking details stay yours.' },
];

const STEPS = [
  { t: 'Find or post a listing', d: 'Browse by category, price and location, or list your own skill or gear.' },
  { t: 'Hire and pay to escrow', d: 'An M-Pesa prompt secures the funds. The provider starts work.' },
  { t: 'Approve and release', d: 'Once it is delivered, approve it and the provider is paid.' },
];
