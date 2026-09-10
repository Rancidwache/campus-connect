import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../context/ThemeContext.jsx';

const ICON = {
  light: (
    <path d="M12 4V2m0 20v-2m8-8h2M2 12h2m13.66 5.66 1.41 1.41M4.93 4.93l1.41 1.41m11.32 0 1.41-1.41M4.93 19.07l1.41-1.41M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" />
  ),
  dark: <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />,
  system: (
    <path d="M4 5h16v11H4zM2 20h20M9.5 16l-.5 4m6-4 .5 4" />
  ),
};

const NEXT = { light: 'dark mode', dark: 'follow system', system: 'light mode' };

export default function ThemeToggle() {
  const { mode, cycle } = useTheme();
  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm"
      onClick={cycle}
      aria-label={`Theme: ${mode}. Switch to ${NEXT[mode]}`}
      title={`Theme: ${mode}`}
      style={{ padding: '7px 9px', borderRadius: 'var(--r-full)' }}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.svg
          key={mode}
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
          animate={{ rotate: 0, opacity: 1, scale: 1 }}
          exit={{ rotate: 90, opacity: 0, scale: 0.6 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        >
          {ICON[mode]}
        </motion.svg>
      </AnimatePresence>
    </button>
  );
}
