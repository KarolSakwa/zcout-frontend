'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

type AttributeIconProps = {
  attributeKey: string;
  label?: string;
  size?: number;
  className?: string;
};

export default function AttributeIcon({
  attributeKey,
  label,
  size = 16,
  className,
}: AttributeIconProps) {
  const [failed, setFailed] = useState(false);
  useEffect(() => {
  setFailed(false);
}, [attributeKey]);

  if (failed) {
    return (
      <span
        className={className}
        aria-hidden={label ? undefined : true}
        style={{
          width: size,
          height: size,
          display: 'inline-block',
          borderRadius: 999,
          background: 'var(--ui-accent-primary-soft)',
          border: '1px solid var(--ui-border-accent)',
        }}
      />
    );
  }

  return (
    <Image
        src={`/icons/attribute-icons/${attributeKey}.svg`}
        alt={label ? `${label} icon` : ''}
        width={size}
        height={size}
        className={className}
        aria-hidden={label ? undefined : true}
        onError={() => setFailed(true)}
        style={{
            width: size,
            height: size,
            flex: `0 0 ${size}px`,
            objectFit: 'contain',
            filter: 'brightness(0) saturate(100%) invert(72%) sepia(55%) saturate(5111%) hue-rotate(193deg) brightness(101%) contrast(103%)',
        }}
        />
  );
}