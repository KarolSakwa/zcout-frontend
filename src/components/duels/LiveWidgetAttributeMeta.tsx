import AttributeIcon from '@/components/AttributeIcon';

export default function LiveWidgetAttributeMeta({
  attributeKey,
  attributeLabel,
  variant = 'default',
}: {
  attributeKey: string;
  attributeLabel: string;
  variant?: 'default' | 'inline';
}) {
  const isInline = variant === 'inline';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        color: isInline ? 'rgba(188, 200, 220, 0.86)' : 'rgba(170,184,205,0.74)',
        fontSize: isInline ? 12 : 11,
        fontWeight: isInline ? 600 : 500,
        lineHeight: 1.2,
        minWidth: 0,
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: isInline ? 13 : 12,
          height: isInline ? 13 : 12,
          display: 'inline-grid',
          placeItems: 'center',
          color: 'var(--ui-accent-primary)',
          opacity: 0.92,
          flexShrink: 0,
        }}
      >
        <AttributeIcon attributeKey={attributeKey} label={attributeLabel} size={isInline ? 11 : 10} />
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