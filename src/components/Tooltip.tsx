'use client';

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

type TooltipProps = {
  content: ReactNode;
  children: ReactNode;
  side?: 'top' | 'bottom';
  align?: 'center' | 'start' | 'end';
};

type TooltipCoords = {
  top: number;
  left: number;
  arrowLeft: number;
};

const VIEWPORT_MARGIN = 12;
const TOOLTIP_GAP = 10;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function computeCoords(
  triggerRect: DOMRect,
  tooltipRect: DOMRect,
  side: 'top' | 'bottom',
  effectiveAlign: 'start' | 'center' | 'end',
): TooltipCoords {
  let left: number;

  if (effectiveAlign === 'start') {
    left = triggerRect.left;
  } else if (effectiveAlign === 'end') {
    left = triggerRect.right - tooltipRect.width;
  } else {
    left =
      triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
  }

  const maxLeft = window.innerWidth - tooltipRect.width - VIEWPORT_MARGIN;
  left = clamp(left, VIEWPORT_MARGIN, Math.max(VIEWPORT_MARGIN, maxLeft));

  let top: number;

  if (side === 'bottom') {
    top = triggerRect.bottom + TOOLTIP_GAP;
  } else {
    top = triggerRect.top - tooltipRect.height - TOOLTIP_GAP;
  }

  const maxTop = window.innerHeight - tooltipRect.height - VIEWPORT_MARGIN;
  top = clamp(top, VIEWPORT_MARGIN, Math.max(VIEWPORT_MARGIN, maxTop));

  const triggerCenterX = triggerRect.left + triggerRect.width / 2;
  const arrowLeft = clamp(
    triggerCenterX - left,
    12,
    Math.max(12, tooltipRect.width - 12),
  );

  return { top, left, arrowLeft };
}

export default function Tooltip({
  content,
  children,
  side = 'top',
  align = 'center',
}: TooltipProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const [coords, setCoords] = useState<TooltipCoords | null>(null);
  const [effectiveAlign, setEffectiveAlign] = useState<
    'start' | 'center' | 'end'
  >(align);

  useEffect(() => {
    if (!open || !triggerRef.current) {
      return;
    }

    const rect = triggerRef.current.getBoundingClientRect();

    if (window.innerWidth - rect.right < 220) {
      setEffectiveAlign('end');
      return;
    }

    if (rect.left < 220) {
      setEffectiveAlign('start');
      return;
    }

    setEffectiveAlign(align);
  }, [open, align]);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) {
      return;
    }

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();

    setCoords(
      computeCoords(triggerRect, tooltipRect, side, effectiveAlign),
    );
  }, [side, effectiveAlign]);

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }

    updatePosition();
  }, [open, updatePosition, content]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleReposition = () => {
      updatePosition();
    };

    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);

    const tooltipElement = tooltipRef.current;
    const resizeObserver =
      tooltipElement != null
        ? new ResizeObserver(handleReposition)
        : null;

    if (tooltipElement && resizeObserver) {
      resizeObserver.observe(tooltipElement);
    }

    return () => {
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
      resizeObserver?.disconnect();
    };
  }, [open, updatePosition]);

  const id = useId();

  const arrowStyle =
    side === 'bottom'
      ? {
          top: -5,
          borderLeft: '5px solid transparent',
          borderRight: '5px solid transparent',
          borderBottom:
            '5px solid color-mix(in srgb, var(--ui-surface-panel-solid) 96%, black)',
        }
      : {
          bottom: -5,
          borderLeft: '5px solid transparent',
          borderRight: '5px solid transparent',
          borderTop:
            '5px solid color-mix(in srgb, var(--ui-surface-panel-solid) 96%, black)',
        };

  const tooltipNode =
    open && typeof document !== 'undefined' ? (
      <span
        ref={tooltipRef}
        id={id}
        role="tooltip"
        style={{
          position: 'fixed',
          top: coords?.top ?? 0,
          left: coords?.left ?? 0,
          zIndex: 5000,
          pointerEvents: 'none',
          width: 'max-content',
          maxWidth: `min(280px, calc(100vw - ${VIEWPORT_MARGIN * 2}px))`,
          padding: '6px 8px',
          border: '1px solid rgba(137, 174, 251, 0.34)',
          borderRadius: 8,
          background: 'rgba(10, 14, 18, 0.96)',
          color: '#f5f7fa',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.28)',
          fontSize: 12,
          fontWeight: 700,
          lineHeight: 1,
          letterSpacing: '0',
          whiteSpace: 'normal',
          visibility: coords ? 'visible' : 'hidden',
        }}
      >
        <span
          style={{
            position: 'absolute',
            width: 0,
            height: 0,
            left: coords?.arrowLeft ?? 12,
            transform: 'translateX(-50%)',
            ...arrowStyle,
          }}
        />
        {content}
      </span>
    ) : null;

  return (
    <span
      ref={triggerRef}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        verticalAlign: 'middle',
      }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      aria-describedby={open ? id : undefined}
    >
      {children}
      {tooltipNode ? createPortal(tooltipNode, document.body) : null}
    </span>
  );
}
