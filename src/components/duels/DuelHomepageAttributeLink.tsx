"use client";

import React from "react";
import Link from "next/link";
import Tooltip from "@/components/Tooltip";
import AttributeIcon from "@/components/AttributeIcon";
import {
  attributeDescriptions,
  formatAttributeLabel,
} from "@/lib/attributeDescriptions";
import styles from "./DuelHomepageAttributeLink.module.css";

export default function DuelHomepageAttributeLink({
  attribute,
}: {
  attribute: string;
}) {
  return (
    <div className={styles.attributeWrap}>
      <Tooltip content={attributeDescriptions[attribute] ?? ""}>
        <span className={styles.linkShell}>
          <Link href="/duels" className={styles.link}>
            <span className={styles.prefix}>WHO&apos;S BETTER AT</span>
            <span className={styles.label}>
              {formatAttributeLabel(attribute).toUpperCase()}
            </span>
            <AttributeIcon
              attributeKey={attribute}
              label={attribute}
              size={19}
            />
          </Link>
        </span>
      </Tooltip>
    </div>
  );
}
