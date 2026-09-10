import { motion } from 'framer-motion';

const EASE = [0.22, 1, 0.36, 1];

// Wrap a route's element. Keyed by pathname in App.jsx via AnimatePresence.
export function PageTransition({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.28, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

export function FadeIn({ children, delay = 0, y = 12, ...rest }) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.4, ease: EASE, delay }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

// Container that staggers its <StaggerItem> children in.
export function Stagger({ children, gap = 0.05, className, style }) {
  return (
    <motion.div
      className={className}
      style={style}
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: gap } } }}
    >
      {children}
    </motion.div>
  );
}

export const staggerItem = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.36, ease: EASE } },
};

export function StaggerItem({ children, className, style }) {
  return (
    <motion.div className={className} style={style} variants={staggerItem}>
      {children}
    </motion.div>
  );
}

// A number/label that pops when it changes (escrow status, counts…).
export function Pop({ children, k }) {
  return (
    <motion.span
      key={k}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.24, ease: EASE }}
      style={{ display: 'inline-flex' }}
    >
      {children}
    </motion.span>
  );
}
