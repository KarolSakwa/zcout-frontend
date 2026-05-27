'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ReactNode } from 'react';

export default function AnimatedProfileContent({
  profileKey,
  children,
}: {
  profileKey: string;
  children: ReactNode;
}) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={profileKey}
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -24 }}
        transition={{
          duration: 0.18,
          ease: 'easeOut',
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}