'use client';

import { motion } from 'framer-motion';
import { ReactNode, useEffect, useRef, useState } from 'react';

export default function AnimatedProfileContent({
  profileKey,
  children,
}: {
  profileKey: string;
  children: ReactNode;
}) {
  const isFirstRender = useRef(true);

  const [direction, setDirection] = useState<
    'next' | 'previous'
  >('next');

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent;

      setDirection(customEvent.detail?.direction ?? 'next');
    };

    window.addEventListener(
      'zcout-profile-navigation',
      handler
    );

    return () => {
      window.removeEventListener(
        'zcout-profile-navigation',
        handler
      );
    };
  }, []);

  useEffect(() => {
    isFirstRender.current = false;
  }, []);

  return (
    <motion.div
      key={profileKey}
      initial={
        isFirstRender.current
          ? false
          : {
              x:
                direction === 'next'
                  ? '100%'
                  : '-100%',
            }
      }
      animate={{
        x: 0,
      }}
      transition={{
        duration: 0.32,
        ease: 'easeOut',
      }}
      style={{
        width: '100%',
      }}
    >
      {children}
    </motion.div>
  );
}