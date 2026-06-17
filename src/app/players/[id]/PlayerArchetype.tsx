"use client";

import Tooltip from "@/components/Tooltip";
import Image from "next/image";
import styles from "./page.module.css";

type PlayerArchetypeProps = {
  label: string;
};

export default function PlayerArchetype({ label }: PlayerArchetypeProps) {
  return (
    <Tooltip content="Player archetype" side="bottom" align="start">
      <div className={styles.playerArchetype}>
        <Image
          src="/icons/clipboard-text.svg"
          width={16}
          height={16}
          alt=""
          aria-hidden
          style={{
            width: 16,
            height: 16,
            flex: "0 0 16px",
            objectFit: "contain",
            filter:
              "brightness(0) saturate(100%) invert(72%) sepia(55%) saturate(5111%) hue-rotate(193deg) brightness(101%) contrast(103%)",
          }}
        />
        <span>{label}</span>
      </div>
    </Tooltip>
  );
}
