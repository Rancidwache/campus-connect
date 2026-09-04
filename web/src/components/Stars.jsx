// Read-only star row (supports halves) or an interactive 1–5 picker.
export default function Stars({ value = 0, size = 16, onChange, label }) {
  const interactive = typeof onChange === 'function';
  const full = Math.floor(value);
  const half = value - full >= 0.5;

  const star = (i) => {
    const fill = interactive
      ? i <= value
        ? 'full'
        : 'empty'
      : i <= full
        ? 'full'
        : i === full + 1 && half
          ? 'half'
          : 'empty';
    const color =
      fill === 'empty' ? 'var(--cc-line)' : 'var(--cc-warn)';
    return (
      <span
        key={i}
        role={interactive ? 'button' : undefined}
        aria-label={interactive ? `${i} star${i > 1 ? 's' : ''}` : undefined}
        onClick={interactive ? () => onChange(i) : undefined}
        style={{
          cursor: interactive ? 'pointer' : 'default',
          color,
          fontSize: size,
          lineHeight: 1,
          position: 'relative',
          display: 'inline-block',
        }}
      >
        {fill === 'half' ? (
          <>
            <span style={{ position: 'absolute', overflow: 'hidden', width: '50%', color: 'var(--cc-warn)' }}>★</span>
            <span>★</span>
          </>
        ) : (
          '★'
        )}
      </span>
    );
  };

  return (
    <span
      className="row"
      style={{ gap: 2, alignItems: 'center' }}
      aria-label={label || (interactive ? 'Pick a rating' : `${value} out of 5`)}
    >
      {[1, 2, 3, 4, 5].map(star)}
    </span>
  );
}
