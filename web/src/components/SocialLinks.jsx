// Small inline SVG glyphs — no icon dependency.
const ICONS = {
  tiktok: 'M17 3c.3 2.2 1.6 3.9 3.7 4.2v3c-1.4 0-2.7-.4-3.7-1.1v6.4A6.5 6.5 0 1 1 10 9.6v3.1a3.4 3.4 0 1 0 3.4 3.4V3H17z',
  instagram:
    'M12 8.6A3.4 3.4 0 1 0 12 15.4 3.4 3.4 0 0 0 12 8.6zm5-1.1a.8.8 0 1 1-1.6 0 .8.8 0 0 1 1.6 0zM7 4h10a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3zm0 1.8A1.2 1.2 0 0 0 5.8 7v10A1.2 1.2 0 0 0 7 18.2h10A1.2 1.2 0 0 0 18.2 17V7A1.2 1.2 0 0 0 17 5.8H7z',
  whatsapp:
    'M12 3a9 9 0 0 0-7.7 13.6L3 21l4.5-1.2A9 9 0 1 0 12 3zm0 1.8a7.2 7.2 0 0 1 6 11.1l-.3.4.7 2.5-2.6-.7-.4.2A7.2 7.2 0 1 1 12 4.8zm-2.3 3c-.2 0-.5 0-.7.3-.3.3-1 1-1 2.4s1 2.8 1.2 3c.2.2 2 3.1 4.9 4.2 2.4.9 2.9.7 3.4.7.5 0 1.6-.7 1.9-1.3.2-.7.2-1.2.2-1.3l-.6-.3-1.7-.8c-.2-.1-.4-.1-.6.1l-.8 1c-.2.2-.3.2-.6.1s-1.2-.4-2.2-1.4c-.8-.7-1.3-1.6-1.5-1.9-.1-.3 0-.4.1-.5l.5-.5.3-.5v-.5l-.8-1.8c-.2-.4-.3-.4-.5-.4h-.4z',
  x: 'M4 4h4.3l3.6 5 4-5H19l-5.6 6.8L20 20h-4.3l-4-5.4L7 20H4.5l6-7.2L4 4z',
  facebook:
    'M13 22v-8h2.6l.4-3H13V9c0-.9.3-1.5 1.6-1.5H16V4.9c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.4-4 4V11H7v3h2.6v8H13z',
  youtube:
    'M21.6 8.2a2.5 2.5 0 0 0-1.8-1.8C18.2 6 12 6 12 6s-6.2 0-7.8.4A2.5 2.5 0 0 0 2.4 8.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 3.8 2.5 2.5 0 0 0 1.8 1.8C5.8 18 12 18 12 18s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8A26 26 0 0 0 22 12a26 26 0 0 0-.4-3.8zM10 15V9l5 3-5 3z',
  linkedin:
    'M6.9 8.5H4V20h2.9V8.5zM5.4 4a1.7 1.7 0 1 0 0 3.4 1.7 1.7 0 0 0 0-3.4zM20 20v-6.3c0-3-1.6-4.5-3.8-4.5a3.3 3.3 0 0 0-3 1.6V8.5H10.4V20h2.9v-6c0-1.6.3-3 2.2-3 1.9 0 2 1.7 2 3.1V20H20z',
  website:
    'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm6.9 8h-3a15 15 0 0 0-1.2-5A7.2 7.2 0 0 1 18.9 11zM12 4.8c.9 1.2 1.7 3.4 1.9 6.2h-3.8C10.3 8.2 11.1 6 12 4.8zM4.8 13h3c.2 2 .6 3.7 1.2 5A7.2 7.2 0 0 1 4.8 13zm3-2h-3a7.2 7.2 0 0 1 4.2-5 15 15 0 0 0-1.2 5zM12 19.2c-.9-1.2-1.7-3.4-1.9-6.2h3.8c-.2 2.8-1 5-1.9 6.2zm2.7-.2c.6-1.3 1-3 1.2-5h3a7.2 7.2 0 0 1-4.2 5z',
};

const LABEL = {
  tiktok: 'TikTok',
  instagram: 'Instagram',
  whatsapp: 'WhatsApp',
  x: 'X',
  facebook: 'Facebook',
  youtube: 'YouTube',
  linkedin: 'LinkedIn',
  website: 'Website',
};

export default function SocialLinks({ socials, size = 20 }) {
  const entries = Object.entries(socials || {}).filter(([k, v]) => ICONS[k] && v);
  if (entries.length === 0) return null;
  return (
    <div className="row" style={{ gap: 10 }}>
      {entries.map(([key, url]) => (
        <a
          key={key}
          href={url}
          target="_blank"
          rel="noreferrer noopener"
          title={LABEL[key]}
          aria-label={LABEL[key]}
          style={{ color: 'var(--cc-muted)', display: 'inline-flex' }}
        >
          <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
            <path d={ICONS[key]} />
          </svg>
        </a>
      ))}
    </div>
  );
}

export const SOCIAL_KEYS = Object.keys(LABEL);
export { LABEL as SOCIAL_LABELS };
