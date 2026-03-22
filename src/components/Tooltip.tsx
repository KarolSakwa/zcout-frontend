'use client';

import { useId, useState, type ReactNode } from 'react';

type TooltipProps = {
  content: ReactNode;
  children: ReactNode;
  side?: 'top' | 'bottom';
  align?: 'center' | 'start' | 'end';
  maxWidth?: number;
};

export default function Tooltip({
  content,
  children,
  side = 'top',
  align = 'center',
  maxWidth = 240,
}: TooltipProps) {
  const [open, setOpen] = useState(false);
  const id = useId();

  const horizontalStyle =
    align === 'start'
      ? { left: 0, transform: 'translateX(0)' }
      : align === 'end'
        ? { right: 0, transform: 'translateX(0)' }
        : { left: '50%', transform: 'translateX(-50%)' };

  const verticalStyle =
    side === 'bottom'
      ? { top: 'calc(100% + 10px)' }
      : { bottom: 'calc(100% + 10px)' };

  const arrowStyle =
    side === 'bottom'
      ? {
          top: -5,
          borderLeft: '5px solid transparent',
          borderRight: '5px solid transparent',
          borderBottom: '5px solid color-mix(in srgb, var(--ui-surface-panel-solid) 96%, black)',
        }
      : {
          bottom: -5,
          borderLeft: '5px solid transparent',
          borderRight: '5px solid transparent',
          borderTop: '5px solid color-mix(in srgb, var(--ui-surface-panel-solid) 96%, black)',
        };

  return (
    <span
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

      {open ? (
        <span
          id={id}
          role="tooltip"
          style={{
            position: 'absolute',
            zIndex: 100,
            pointerEvents: 'none',
            maxWidth,
            padding: '8px 10px',
            border: '1px solid color-mix(in srgb, var(--ui-border-subtle) 115%, transparent)',
            borderRadius: 'var(--ui-radius-control)',
            background: 'color-mix(in srgb, var(--ui-surface-panel-solid) 96%, black)',
            color: 'var(--ui-text-primary)',
            boxShadow:
              '0 10px 24px rgba(0, 0, 0, 0.34), inset 0 1px 0 rgba(255, 255, 255, 0.03)',
            fontSize: '0.78rem',
            fontWeight: 700,
            lineHeight: 1.35,
            letterSpacing: '0.01em',
            whiteSpace: 'normal',
            ...verticalStyle,
            ...horizontalStyle,
          }}
        >
          <span
            style={{
              position: 'absolute',
              width: 0,
              height: 0,
              ...arrowStyle,
              ...(align === 'start'
                ? { left: 12 }
                : align === 'end'
                  ? { right: 12 }
                  : { left: '50%', transform: 'translateX(-50%)' }),
            }}
          />
          {content}
        </span>
      ) : null}
    </span>
  );
}