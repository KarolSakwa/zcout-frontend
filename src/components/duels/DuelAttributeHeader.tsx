'use client';

import React from 'react';
import AttributeIcon from '@/components/AttributeIcon';
import Tooltip from '@/components/Tooltip';
import { attributeDescriptions, formatAttributeLabel } from '@/lib/attributeDescriptions';
import styles from './DuelAttributeHeader.module.css';

export default function DuelAttributeHeader({ attribute }: { attribute: string }) {
  if (!attribute) return null;

  const formattedLabel = formatAttributeLabel(String(attribute));

  return (
    <div className={styles.wrap}>
      <div className={styles.eyebrow}>Who&apos;s better at...</div>

      <Tooltip content={attributeDescriptions[attribute] ?? ''}>
        <div className={styles.attributeBlock}>
          <div className={styles.iconWrap}>
            <AttributeIcon attributeKey={attribute} label={attribute} size={20} />
          </div>

          <div className={styles.label}>{formattedLabel}</div>
        </div>
      </Tooltip>

      <div className={styles.rule} aria-hidden />
    </div>
  );
}
