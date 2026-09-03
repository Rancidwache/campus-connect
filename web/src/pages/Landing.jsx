import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="stack">
      <section className="card" style={{ background: 'var(--cc-teal-50)', borderColor: 'var(--cc-teal-500)' }}>
        <h1>Earn from a skill. Hire with confidence.</h1>
        <p style={{ maxWidth: 620 }}>
          Campus Connect V2 is a marketplace for Kenyan Gen Z: list a digital skill or a
          physical item for hire, agree a price, and let <strong>HustleGuard</strong> hold
          the payment in M-Pesa escrow until the job is done. Chat stays end-to-end
          encrypted the whole way.
        </p>
        <div className="row">
          <Link to="/browse" className="btn btn-primary">
            Browse listings
          </Link>
          {user ? (
            <Link to="/listings/new" className="btn btn-ghost">
              Post a listing
            </Link>
          ) : (
            <Link to="/register" className="btn btn-ghost">
              Create an account
            </Link>
          )}
        </div>
      </section>

      <section className="grid-listings">
        <Feature
          title="One place for skills and gear"
          body="Tutoring, photography, design — and the camera, keyboard or PA speakers to go with them."
        />
        <Feature
          title="HustleGuard M-Pesa escrow"
          body="The client pays into escrow with an STK Push. Funds only release when they approve delivery."
        />
        <Feature
          title="Private by default"
          body="Every chat is end-to-end encrypted, so booking details and phone numbers stay between the two of you."
        />
      </section>
    </div>
  );
}

function Feature({ title, body }) {
  return (
    <div className="card">
      <h3>{title}</h3>
      <p className="muted" style={{ margin: 0, fontSize: '0.9rem' }}>
        {body}
      </p>
    </div>
  );
}
