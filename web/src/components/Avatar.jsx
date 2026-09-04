function initials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

// Deterministic soft colour from the name.
function hue(name = '') {
  let h = 0;
  for (let i = 0; i < name.length; i += 1) h = (h * 31 + name.charCodeAt(i)) % 360;
  return h;
}

export default function Avatar({ src, name, size = 40 }) {
  const style = {
    width: size,
    height: size,
    borderRadius: '50%',
    flexShrink: 0,
    objectFit: 'cover',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: size * 0.4,
    color: '#fff',
    background: `hsl(${hue(name)} 45% 55%)`,
    border: '1px solid var(--cc-line)',
  };
  if (src) return <img src={src} alt={name || ''} style={style} loading="lazy" />;
  return (
    <span style={style} aria-hidden>
      {initials(name) || '?'}
    </span>
  );
}
