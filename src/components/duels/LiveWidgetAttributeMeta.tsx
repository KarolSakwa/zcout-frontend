import AttributeIcon from '@/components/AttributeIcon';

export default function LiveWidgetAttributeMeta({
  attributeKey,
  attributeLabel,
  variant = 'default',
  compact = false,
}: {
  attributeKey: string;
  attributeLabel: string;
  variant?: 'default' | 'inline';
  compact?: boolean;
}) {
  const isInline = variant === 'inline';
  const labelFontSize = isInline ? (compact ? 11 : 12) : compact ? 10 : 11;
  const iconSize = isInline ? (compact ? 10 : 11) : compact ? 9 : 10;
  const iconBoxSize = isInline ? (compact ? 12 : 13) : compact ? 11 : 12;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        color: isInline ? 'rgba(188, 200, 220, 0.86)' : 'rgba(170,184,205,0.74)',
        fontSize: labelFontSize,
        fontWeight: isInline ? 600 : 500,
        lineHeight: 1.2,
        minWidth: 0,
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: iconBoxSize,
          height: iconBoxSize,
          display: 'inline-grid',
          placeItems: 'center',
          color: 'var(--ui-accent-primary)',
          opacity: 0.92,
          flexShrink: 0,
        }}
      >
        <AttributeIcon attributeKey={attributeKey} label={attributeLabel} size={iconSize} />
      </span>

      <span
        style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {attributeLabel}
      </span>
    </div>
  );
}