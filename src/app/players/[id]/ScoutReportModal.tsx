'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import ZLoader from '@/components/ZLoader';
import Button from '@/components/ui/Button';
import buttonStyles from '@/components/ui/Button.module.css';
import type { ScoutReportAttribute } from './ScoutReportTrigger';
import ScoutReportAttributeRow, {
  createFallbackDraft,
} from './ScoutReportAttributeRow';
import styles from './ScoutReportTrigger.module.css';
import type { AttributeDraft } from './useScoutReportDrafts';

export type ScoutReportModalProps = {
  isMounted: boolean;
  isSubmitting: boolean;
  playerId: number;
  playerMeta: string;
  requiresAuth: boolean;
  isLoadingModalAttributes: boolean;
  attributesError: string | null;
  attributes: ScoutReportAttribute[];
  drafts: Record<number, AttributeDraft>;
  submitError: string | null;
  hasActions: boolean;
  onUserClose: () => void;
  onExitComplete: () => void;
  onVoteChange: (attributeId: number, value: string) => void;
  onSkipToggle: (attributeId: number) => void;
  onSubmit: () => void;
};

export default function ScoutReportModal({
  isMounted,
  isSubmitting,
  playerId,
  playerMeta,
  requiresAuth,
  isLoadingModalAttributes,
  attributesError,
  attributes,
  drafts,
  submitError,
  hasActions,
  onUserClose,
  onExitComplete,
  onVoteChange,
  onSkipToggle,
  onSubmit,
}: ScoutReportModalProps) {
  const [visible, setVisible] = useState(false);

  const requestClose = useCallback(() => {
    if (isSubmitting) return;

    onUserClose();
    setVisible(false);
  }, [isSubmitting, onUserClose]);

  useEffect(() => {
    if (!isMounted) {
      setVisible(false);
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        requestClose();
      }
    };

    document.addEventListener('keydown', onKeyDown);

    const raf = window.requestAnimationFrame(() => {
      setVisible(true);
    });

    return () => {
      window.cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isMounted, requestClose]);

  useEffect(() => {
    if (!isMounted || visible) return;

    const timeout = window.setTimeout(() => {
      onExitComplete();
    }, 180);

    return () => window.clearTimeout(timeout);
  }, [isMounted, visible, onExitComplete]);

  if (!isMounted) {
    return null;
  }

  return (
    <div
      className={[styles.overlay, visible ? styles.overlayVisible : ''].join(' ')}
      onClick={requestClose}
    >
      <div
        className={[styles.panel, visible ? styles.panelVisible : ''].join(' ')}
        onClick={(event) => event.stopPropagation()}
      >
        {isSubmitting ? (
          <div className={styles.submittingOverlay}>
            <div className={styles.submittingLoaderWrap}>
              <ZLoader />
            </div>
          </div>
        ) : null}

        <div className={styles.header}>
          <div className={styles.headerCenter}>
            <div className={styles.reportTitle}>Scout Report</div>
            <div className={styles.reportMeta}>{playerMeta}</div>
          </div>

          <button
            type="button"
            onClick={requestClose}
            className={styles.closeButton}
          >
            ×
          </button>
        </div>

        <div className={styles.body}>
          {requiresAuth ? (
            <div className={styles.authGate}>
              <div className={styles.authGateTitle}>
                Scout Report is available only for logged-in scouts.
              </div>

              <div className={styles.authGateActions}>
                <Link
                  href={`/login?redirect=${encodeURIComponent(`/players/${playerId}`)}`}
                  className={[
                    buttonStyles.button,
                    buttonStyles.primary,
                    buttonStyles.md,
                    styles.authGateButton,
                  ].join(' ')}
                >
                  Log in
                </Link>
              </div>
            </div>
          ) : isLoadingModalAttributes ? (
            <div className={styles.loadingState}>
              <ZLoader />
            </div>
          ) : attributesError ? (
            <div>{attributesError}</div>
          ) : (
            <>
              <div className={styles.attributeList}>
                {attributes.map((attribute) => {
                  const draft = drafts[attribute.id] ?? createFallbackDraft(attribute.id);

                  return (
                    <ScoutReportAttributeRow
                      key={attribute.id}
                      attribute={attribute}
                      draft={draft}
                      onVoteChange={(value) => onVoteChange(attribute.id, value)}
                      onSkipToggle={() => onSkipToggle(attribute.id)}
                    />
                  );
                })}
              </div>

              {submitError ? <div className={styles.submitError}>{submitError}</div> : null}

              <div className={styles.footerActions}>
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  className={styles.submitButton}
                  disabled={!hasActions || isSubmitting}
                  onClick={onSubmit}
                >
                  Submit
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
