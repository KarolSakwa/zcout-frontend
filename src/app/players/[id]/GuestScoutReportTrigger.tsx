'use client';

import { useState } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import buttonStyles from '@/components/ui/Button.module.css';
import styles from './ScoutReportTrigger.module.css';

type Props = {
  playerId: number;
  className?: string;
};

export default function GuestScoutReportTrigger({
  playerId,
  className,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="primary"
        size="md"
        className={className}
        onClick={() => setOpen(true)}
      >
        Scout Report
      </Button>

      {open ? (
        <div
          className={`${styles.overlay} ${styles.overlayVisible}`}
          onClick={() => setOpen(false)}
        >
          <div
            className={`${styles.panel} ${styles.panelVisible}`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.header}>
              <div className={styles.headerCenter}>
                <div className={styles.reportTitle}>Scout Report</div>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className={styles.closeButton}
              >
                ×
              </button>
            </div>

            <div className={styles.body}>
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
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}