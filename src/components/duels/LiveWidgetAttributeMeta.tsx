import AttributeIcon from '@/components/AttributeIcon';

export default function LiveWidgetAttributeMeta({
  attributeKey,
  attributeLabel,
}: {
  attributeKey: string;
  attributeLabel: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        color: 'rgba(170,184,205,0.74)',
        fontSize: 11,
        fontWeight: 500,
        lineHeight: 1.2,
      }}
    >
      <span
        style={{
          width: 12,
          height: 12,
          display: 'inline-grid',
          placeItems: 'center',
          color: 'var(--ui-accent-primary)',
          opacity: 0.92,
          flexShrink: 0,
        }}
      >
        <AttributeIcon attributeKey={attributeKey} label={attributeLabel} size={10} />
      </span>

      <span>{attributeLabel}</span>
    </div>
  );
}