"use client";

import React from "react";
import Link from "next/link";
import Tooltip from "@/components/Tooltip";
import AttributeIcon from "@/components/AttributeIcon";
import {
  attributeDescriptions,
  formatAttributeLabel,
} from "@/lib/attributeDescriptions";

export default function DuelHomepageAttributeLink({
  attribute,
}: {
  attribute: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        marginBottom: 10,
      }}
    >
      <Tooltip content={attributeDescriptions[attribute] ?? ""}>
        <Link
          href="/duels"
          className="duelHomepageAttributeLink"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            gap: 7,
            marginBottom: 10,
            color: "var(--ui-text-muted)",
            fontSize: 13,
            fontWeight: 800,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            textDecoration: "none",
          }}
        >
          <>
            <span
              style={{
                color: "var(--ui-text-muted)",
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: "0.12em",
              }}
            >
              WHO&apos;S BETTER AT
            </span>

            <span
              style={{
                color: "var(--ui-text-primary)",
                fontSize: 17,
                fontWeight: 900,
                letterSpacing: "0.08em",
              }}
            >
              {formatAttributeLabel(attribute).toUpperCase()}
            </span>
          </>

          <AttributeIcon
            attributeKey={attribute}
            label={attribute}
            size={19}
          />
        </Link>
      </Tooltip>

      <style jsx>{`
        .duelHomepageAttributeLink {
          cursor: pointer;
          transition: opacity 140ms ease;
        }

        .duelHomepageAttributeLink:hover {
          opacity: 0.88;
        }
      `}</style>
    </div>
  );
}
