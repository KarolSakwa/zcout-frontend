import Tooltip from './Tooltip';
import styles from './FeaturedOverallBlock.module.css';
import { getRatingColor } from '@/lib/ratings';

type Props = {
  rating: number;
  confidence: number;
  scalePx?: number;
};

export default function FeaturedOverallBlock({
  rating,
  confidence,
  scalePx = 96,
}: Props) {
  const barWidth = Math.max(6, Math.round(scalePx * 0.24));
  const barHeight = Math.max(10, Math.round(scalePx * 1.2));

  const normalizedConfidence = Math.max(
    0,
    Math.min(100, Number(confidence ?? 0))
  );

  const roundedFill = Math.round(normalizedConfidence);

  return (
    <div className={styles.container}>
      <div
        className={styles.content}
        style={{
            gap: `${Math.round(scalePx * 0.17)}px`,
        }}
        >
        <div
          className={styles.ratingColumn}
          style={{
            height: `${barHeight}px`,
          }}
        >
          <div
            className={styles.label}
            style={{
                fontSize: `${Math.round(scalePx * 0.15)}px`,
                marginBottom: `${Math.round(scalePx * 0.08)}px`,
            }}
            >
            OVERALL
            </div>

          <Tooltip content={rating.toFixed(2)}>
            <div
              className={styles.rating}
              style={{
                fontSize: `${scalePx}px`,
                color: getRatingColor(rating),
                fontFamily: 'var(--font-rating), "Segoe UI", system-ui, sans-serif',
                letterSpacing: '-0.04em',
                fontVariantNumeric: 'tabular-nums lining-nums',
                fontFeatureSettings: '"tnum" 1, "lnum" 1',
                cursor: 'help',
              }}
            >
              {rating}
            </div>
          </Tooltip>
        </div>

        <Tooltip content={`Confidence: ${normalizedConfidence.toFixed(2)}%`}>
          <span className={styles.confidenceWrapper}>
            <span
              style={{
                display: 'inline-block',
                width: `${barWidth}px`,
                height: `${barHeight}px`,
                borderRadius: '999px',
                background: 'var(--ui-surface-soft-2)',
                border: '1px solid color-mix(in srgb, white 24%, transparent)',
                boxSizing: 'border-box',
                overflow: 'hidden',
                position: 'relative',
                flexShrink: 0,
                cursor: 'help',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: 0,
                  height: `${roundedFill}%`,
                  borderRadius: '999px',
                  background: 'var(--ui-accent-primary)',
                }}
              />
            </span>
          </span>
        </Tooltip>
      </div>
    </div>
  );
}