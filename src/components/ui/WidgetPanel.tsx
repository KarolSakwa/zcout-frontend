'use client';

import React from 'react';
import styles from './WidgetPanel.module.css';

export type WidgetPanelVariant = 'glass' | 'card' | 'duel';

type WidgetPanelProps = {
  variant: WidgetPanelVariant;
  embedded?: boolean;
  compact?: boolean;
  title?: string;
  headerMeta?: React.ReactNode;
  borderTitle?: boolean;
  noPadding?: boolean;
  className?: string;
  children: React.ReactNode;
  as?: 'aside' | 'section' | 'div';
  id?: string;
  ariaLabelledBy?: string;
  style?: React.CSSProperties;
};

export default function WidgetPanel({
  variant,
  embedded = false,
  compact = false,
  title,
  headerMeta,
  borderTitle,
  noPadding = false,
  className = '',
  children,
  as: Component = 'div',
  id,
  ariaLabelledBy,
  style,
}: WidgetPanelProps) {
  const useBorderTitle =
    borderTitle ??
    (Boolean(title) && (embedded || variant === 'card' || variant === 'duel'));
  const titleId = title ? `${id ?? 'widget-panel'}-title` : undefined;

  const panelClassName = [
    styles.panel,
    styles[variant],
    variant === 'glass'
      ? embedded
        ? compact
          ? styles.embeddedCompact
          : styles.embedded
        : styles.floating
      : '',
    variant === 'card' && noPadding ? styles.noPadding : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Component
      id={id}
      className={panelClassName}
      aria-labelledby={ariaLabelledBy ?? titleId}
      style={style}
    >
      {useBorderTitle && title ? (
        <span className={styles.borderTitle} id={titleId}>
          {title}
        </span>
      ) : null}

      {!useBorderTitle && title ? (
        <div className={styles.headerRow}>
          <div className={styles.inlineTitle}>{title}</div>
          {headerMeta ? <div className={styles.headerMeta}>{headerMeta}</div> : null}
        </div>
      ) : null}

      {useBorderTitle && headerMeta ? (
        <div className={styles.metaRow}>
          <span className={styles.metaSpacer} aria-hidden="true" />
          <div className={styles.headerMeta}>{headerMeta}</div>
        </div>
      ) : null}

      {children}
    </Component>
  );
}
