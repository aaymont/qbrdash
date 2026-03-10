import { motion } from "framer-motion";

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

const pageTransition = { duration: 0.25, ease: [0, 0, 0.2, 1] as const };

export function AnimatedPage({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      transition={pageTransition}
    >
      {children}
    </motion.div>
  );
}

const cardVariants = {
  initial: { opacity: 0, y: 12 },
  animate: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.3 },
  }),
};

interface AnimatedCardProps {
  children: React.ReactNode;
  index?: number;
}

export function AnimatedCard({ children, index = 0 }: AnimatedCardProps) {
  return (
    <motion.div
      custom={index}
      initial="initial"
      animate="animate"
      variants={cardVariants}
      whileHover={{ scale: 1.02, transition: { duration: 0.15 } }}
      style={{ height: "100%" }}
    >
      {children}
    </motion.div>
  );
}

const rowVariants = {
  initial: { opacity: 0 },
  animate: (i: number) => ({
    opacity: 1,
    transition: { delay: i * 0.02 },
  }),
};

interface AnimatedTableRowProps {
  children: React.ReactNode;
  index?: number;
  onClick?: () => void;
}

export function AnimatedTableRow({ children, index = 0, onClick }: AnimatedTableRowProps) {
  return (
    <motion.tr
      custom={index}
      initial="initial"
      animate="animate"
      variants={rowVariants}
      whileHover={{ backgroundColor: "rgba(0,0,0,0.04)" }}
      onClick={onClick}
      style={{ cursor: onClick ? "pointer" : "default" }}
    >
      {children}
    </motion.tr>
  );
}

const drawerVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

export function AnimatedDrawerContent({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={drawerVariants}
    >
      {children}
    </motion.div>
  );
}

const chartVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.4, delay: 0.1 } },
};

export function AnimatedChart({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={chartVariants}
      style={{ height: "100%", width: "100%" }}
    >
      {children}
    </motion.div>
  );
}

const staggerContainer = {
  animate: {
    transition: { staggerChildren: 0.06 },
  },
};

const staggerItem = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
};

export function AnimatedStaggerContainer({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <motion.div variants={staggerContainer} initial="initial" animate="animate">
      {children}
    </motion.div>
  );
}

export function AnimatedStaggerItem({
  children,
}: {
  children: React.ReactNode;
}) {
  return <motion.div variants={staggerItem}>{children}</motion.div>;
}
