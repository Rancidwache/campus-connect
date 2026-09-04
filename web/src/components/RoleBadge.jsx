const MAP = {
  PROVIDER: { label: 'Provider', bg: 'var(--cc-teal-50)', fg: 'var(--cc-teal-700)', bd: 'var(--cc-teal-500)' },
  CUSTOMER: { label: 'Customer', bg: 'var(--cc-ok-bg)', fg: 'var(--cc-ok)', bd: 'var(--cc-ok)' },
  VISITOR: { label: 'Visitor', bg: '#f1f5f9', fg: 'var(--cc-muted)', bd: 'var(--cc-line)' },
};

export default function RoleBadge({ role }) {
  const s = MAP[role] || MAP.VISITOR;
  return (
    <span
      className="badge"
      style={{ background: s.bg, color: s.fg, border: `1px solid ${s.bd}` }}
    >
      {s.label}
    </span>
  );
}

// Colour a chat/name accent by role (used for the author name).
export function roleColor(role) {
  return (MAP[role] || MAP.VISITOR).fg;
}
