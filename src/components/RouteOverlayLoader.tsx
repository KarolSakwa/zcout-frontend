'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import ZLoader from './ZLoader';

const START_EVT = 'zcout-route-loading:start';
const STOP_EVT = 'zcout-route-loading:stop';

export default function RouteOverlayLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [active, setActive] = useState(false);
  const [viewport, setViewport] = useState({ left: 0, top: 0, width: 0, height: 0 });

  useEffect(() => {
    const updateViewport = () => {
      const vv = window.visualViewport;

      setViewport({
        left: vv?.offsetLeft ?? 0,
        top: vv?.offsetTop ?? 0,
        width: vv?.width ?? window.innerWidth,
        height: vv?.height ?? window.innerHeight,
      });
    };

    updateViewport();

    window.visualViewport?.addEventListener('resize', updateViewport);
    window.visualViewport?.addEventListener('scroll', updateViewport);
    window.addEventListener('resize', updateViewport);

    return () => {
      window.visualViewport?.removeEventListener('resize', updateViewport);
      window.visualViewport?.removeEventListener('scroll', updateViewport);
      window.removeEventListener('resize', updateViewport);
    };
  }, []);

  useEffect(() => {
    setActive(false);
  }, [pathname, searchParams]);

  useEffect(() => {
    const onStart = () => setActive(true);
    const onStop = () => setActive(false);

    const onClickCapture = (e: MouseEvent) => {
      if (e.defaultPrevented) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const el = e.target as Element | null;
      const a = el?.closest('a') as HTMLAnchorElement | null;
      if (!a) return;

      if (a.target && a.target !== '_self') return;
      if (a.hasAttribute('download')) return;

      const hrefAttr = a.getAttribute('href');
      if (!hrefAttr) return;
      if (hrefAttr.startsWith('#')) return;
      if (hrefAttr.startsWith('mailto:') || hrefAttr.startsWith('tel:')) return;

      let url: URL;

      try {
        url = new URL(a.href, window.location.href);
      } catch {
        return;
      }

      if (url.origin !== window.location.origin) return;

      const next = `${url.pathname}${url.search}${url.hash}`;
      const cur = `${window.location.pathname}${window.location.search}${window.location.hash}`;

      if (next === cur) return;

      setActive(true);
    };

    window.addEventListener(START_EVT, onStart);
    window.addEventListener(STOP_EVT, onStop);
    document.addEventListener('click', onClickCapture, true);

    return () => {
      window.removeEventListener(START_EVT, onStart);
      window.removeEventListener(STOP_EVT, onStop);
      document.removeEventListener('click', onClickCapture, true);
    };
  }, []);

  if (!active) return null;

  return (
    <div
      style={{
        position: 'fixed',
        left: viewport.left,
        top: viewport.top,
        width: viewport.width,
        height: viewport.height,
        display: 'grid',
        placeItems: 'center',
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
      }}
    >
      <ZLoader />
    </div>
  );
}

export const routeLoading = {
  start() {
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(START_EVT));
  },
  stop() {
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(STOP_EVT));
  },
};