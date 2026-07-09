"use client";

import React from "react";
import ZLoader from "../ZLoader";

type DuelLoadingOverlaysProps = {
  homepageMode: boolean;
  showDelayedNextPending?: boolean;
  showHomepagePairLoading?: boolean;
  showOverlayLoader?: boolean;
  placement: "stage" | "shell";
};

export default function DuelLoadingOverlays({
  homepageMode,
  showDelayedNextPending = false,
  showHomepagePairLoading = false,
  showOverlayLoader = false,
  placement,
}: DuelLoadingOverlaysProps) {
  if (placement === "stage") {
    if (!showDelayedNextPending) return null;

    return homepageMode ? (
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 80,
          display: "grid",
          placeItems: "center",
          pointerEvents: "none",
        }}
        aria-hidden
      >
        <ZLoader />
      </div>
    ) : (
      <div
        style={{
          position: "fixed",
          left: "50vw",
          top: "50dvh",
          transform: "translate(-50%, -50%)",
          zIndex: 80,
          display: "grid",
          placeItems: "center",
          pointerEvents: "none",
        }}
        aria-hidden
      >
        <ZLoader />
      </div>
    );
  }

  return (
    <>
      {showHomepagePairLoading && (
        <div className="duelHomepageInitialLoader" aria-hidden>
          <ZLoader />
        </div>
      )}

      {showOverlayLoader && !homepageMode && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 80,
            background:
              "radial-gradient(circle at 50% 35%, rgba(0,0,0,0.45), rgba(0,0,0,0.82))",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            display: "grid",
            placeItems: "center",
          }}
          aria-hidden
        >
          <ZLoader />
        </div>
      )}

      <style jsx>{`
        .duelHomepageInitialLoader {
          position: absolute;
          inset: 0;
          z-index: 80;
          display: grid;
          place-items: center;
          pointer-events: none;
        }
      `}</style>
    </>
  );
}
