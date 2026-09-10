import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div style={{ minHeight: 'calc(100dvh - var(--header-h) - 120px)', display: 'grid', placeItems: 'center', paddingBlock: 'var(--sp-6)' }}>
      <motion.div
        className="stack"
        style={{ width: '100%', maxWidth: 'var(--maxw-narrow)' }}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 9, alignSelf: 'center', textDecoration: 'none' }}>
          <span
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background: 'var(--brand)',
              color: 'var(--brand-contrast)',
              display: 'grid',
              placeItems: 'center',
              fontWeight: 900,
            }}
          >
            C
          </span>
          <strong style={{ color: 'var(--text)', letterSpacing: '-0.02em' }}>Campus Connect V2</strong>
        </Link>

        <div className="card stack">
          <div className="stack-2">
            <h1 style={{ margin: 0 }}>{title}</h1>
            {subtitle && (
              <p className="muted" style={{ margin: 0, fontSize: 'var(--fs-sm)' }}>
                {subtitle}
              </p>
            )}
          </div>
          {children}
        </div>

        {footer && (
          <p className="muted" style={{ textAlign: 'center', fontSize: 'var(--fs-sm)', margin: 0 }}>
            {footer}
          </p>
        )}
      </motion.div>
    </div>
  );
}
