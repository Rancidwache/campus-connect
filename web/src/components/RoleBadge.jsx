const MAP = {
  PROVIDER: { label: 'Provider', cls: 'badge-brand', fg: 'var(--brand-strong)' },
  CUSTOMER: { label: 'Customer', cls: 'badge-ok', fg: 'var(--ok)' },
  VISITOR: { label: 'Visitor', cls: 'badge-muted', fg: 'var(--text-dim)' },
};

export default function RoleBadge({ role }) {
  const s = MAP[role] || MAP.VISITOR;
  return <span className={`badge ${s.cls}`}>{s.label}</span>;
}

// Colour a name accent by role (used for the author name).
export function roleColor(role) {
  return (MAP[role] || MAP.VISITOR).fg;
}
