'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ReactNode, useEffect, useRef, useState } from 'react';

export default function AnimatedProfileContent({
  profileKey,
  children,
}: {
  profileKey: string;
  children: ReactNode;
}) {
  const isFirstRender = useRef(true);
  const [direction, setDirection] = useState<'next' | 'previous'>('next');

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent;

      setDirection(customEvent.detail?.direction ?? 'next');
    };

    window.addEventListener('zcout-profile-navigation', handler);

    return () => {
      window.removeEventListener('zcout-profile-navigation', handler);
    };
  }, []);

  useEffect(() => {
    isFirstRender.current = false;
  }, []);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={profileKey}
        initial={
          isFirstRender.current
            ? false
            : {
                x: direction === 'next' ? 120 : -120,
              }
        }
        animate={{
          x: 0,
        }}
        exit={{
          x: direction === 'next' ? -120 : 120,
        }}
        transition={{
          duration: 0.24,
          ease: 'easeOut',
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}