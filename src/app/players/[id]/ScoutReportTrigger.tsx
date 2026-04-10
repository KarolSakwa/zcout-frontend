'use client';

import type { CSSProperties } from 'react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import AttributeIcon from '@/components/AttributeIcon';
import RatingWithConfidence from '@/components/RatingWithConfidence';
import { getRatingColor } from '@/lib/ratings';
import styles from './ScoutReportTrigger.module.css';
import ZLoader from '@/components/ZLoader';
import { useAuth } from '@/components/AuthProvider';
import Button from '@/components/ui/Button';
import buttonStyles from '@/components/ui/Button.module.css';

type ScoutReportAttribute = {
  id: number;
  key: string;
  label: string;
  group?: string;
  is_skipped?: boolean;
  description?: string;
};

type DraftState = 'untouched' | 'vote' | 'skip';

type AttributeDraft = {
  attributeId: number;
  state: DraftState;
  value: string;
};

type ScoutReportTriggerProps = {
  playerId: number;
  playerName: string;
  playerPosition: string | null;
  clubName: string | null;
  attributes: ScoutReportAttribute[];
  className?: string;
};

export default function ScoutReportTrigger({
  playerId,
  playerName,
  playerPosition,
  clubName,
  attributes,
  className,
}: ScoutReportTriggerProps) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [drafts, setDrafts] = useState<Record<number, AttributeDraft>>({});
  const [serverAttributes, setServerAttributes] = useState<ScoutReportAttribute[]>([]);
  const [isLoadingAttributes, setIsLoadingAttributes] = useState(false);
  const [attributesError, setAttributesError] = useState<string | null>(null);
  const [requiresAuth, setRequiresAuth] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { user, isAuthResolved } = useAuth();

  const storageKey = `scout-report-draft:${playerId}`;
  const activeAttributes = serverAttributes.length > 0 ? serverAttributes : attributes;

  const emptyDrafts = useMemo<Record<number, AttributeDraft>>(
    () =>
      Object.fromEntries(
        activeAttributes.map((attribute) => [
          attribute.id,
          {
            attributeId: attribute.id,
            state: 'untouched' as DraftState,
            value: '',
          },
        ])
      ),
    [activeAttributes]
  );

  const hasActions = useMemo(
    () => Object.values(drafts).some((draft) => draft.state !== 'untouched'),
    [drafts]
  );

  useEffect(() => {
    if (!mounted) return;
    if (!isAuthResolved) return;

    let cancelled = false;

    const loadScoutReport = async () => {
      setIsLoadingAttributes(true);
      setAttributesError(null);
      setRequiresAuth(false);

      try {
        if (!user) {
          if (cancelled) return;
          setRequiresAuth(true);
          setServerAttributes([]);
          return;
        }

        const res = await fetch(`/api/scout-report/attributes/${playerId}`, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
          cache: 'no-store',
        });

        if (res.status === 401) {
          if (cancelled) return;
          setRequiresAuth(true);
          setServerAttributes([]);
          return;
        }

        if (!res.ok) {
          throw new Error(`Failed to load Scout Report attributes: ${res.status}`);
        }

        const data = (await res.json()) as {
          player_id: number;
          items: ScoutReportAttribute[];
        };

        if (cancelled) return;

        setServerAttributes(data.items ?? []);
      } catch (error) {
        if (cancelled) return;

        setAttributesError(
          error instanceof Error ? error.message : 'Failed to load Scout Report.'
        );
        setServerAttributes([]);
      } finally {
        if (!cancelled) {
          setIsLoadingAttributes(false);
        }
      }
    };

    loadScoutReport();

    return () => {
      cancelled = true;
    };
  }, [mounted, playerId, user, isAuthResolved]);

  useEffect(() => {
    if (!mounted) return;

    const raw = window.localStorage.getItem(storageKey);

    if (!raw) {
      setDrafts(emptyDrafts);
      return;
    }

    try {
      const parsed = JSON.parse(raw) as Record<string, AttributeDraft>;
      const normalized = Object.fromEntries(
        activeAttributes.map((attribute) => {
          const draft =
            parsed[String(attribute.id)] ??
            parsed[attribute.id as unknown as string];

          if (
            !draft ||
            draft.attributeId !== attribute.id ||
            !['untouched', 'vote', 'skip'].includes(draft.state)
          ) {
            return [
              attribute.id,
              {
                attributeId: attribute.id,
                state: 'untouched' as DraftState,
                value: '',
              },
            ];
          }

          if (draft.state === 'vote') {
            const numeric = Number(draft.value);

            if (!Number.isFinite(numeric)) {
              return [
                attribute.id,
                {
                  attributeId: attribute.id,
                  state: 'untouched' as DraftState,
                  value: '',
                },
              ];
            }

            const clamped = Math.max(1, Math.min(99, numeric));

            return [
              attribute.id,
              {
                attributeId: attribute.id,
                state: 'vote' as DraftState,
                value: String(clamped),
              },
            ];
          }

          return [
            attribute.id,
            {
              attributeId: attribute.id,
              state: draft.state,
              value: '',
            },
          ];
        })
      ) as Record<number, AttributeDraft>;

      setDrafts(normalized);
    } catch {
      setDrafts(emptyDrafts);
    }
  }, [mounted, storageKey, emptyDrafts, activeAttributes]);

  useEffect(() => {
    if (!mounted) return;

    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (isSubmitting) return;
        setVisible(false);
      }
    };

    document.addEventListener('keydown', onKeyDown);

    const raf = window.requestAnimationFrame(() => {
      setVisible(true);
    });

    return () => {
      window.cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [mounted, isSubmitting]);

  useEffect(() => {
    if (!mounted) return;

    if (!hasActions) {
      window.localStorage.removeItem(storageKey);
      return;
    }

    window.localStorage.setItem(storageKey, JSON.stringify(drafts));
  }, [drafts, mounted, storageKey, hasActions]);

  useEffect(() => {
    if (!mounted || visible) return;

    const timeout = window.setTimeout(() => {
      setMounted(false);
    }, 180);

    return () => window.clearTimeout(timeout);
  }, [mounted, visible]);

  const openModal = () => {
    setMounted(true);
  };

  const closeModal = () => {
    if (isSubmitting) return;
    setVisible(false);
  };

  const setVoteValue = (attributeId: number, nextValue: string) => {
    const digitsOnly = nextValue.replace(/[^\d]/g, '');

    if (digitsOnly === '') {
      setDrafts((prev) => ({
        ...prev,
        [attributeId]: {
          attributeId,
          state: 'untouched',
          value: '',
        },
      }));
      return;
    }

    const numeric = Math.max(1, Math.min(99, Number(digitsOnly)));

    setDrafts((prev) => ({
      ...prev,
      [attributeId]: {
        attributeId,
        state: 'vote',
        value: String(numeric),
      },
    }));
  };

  const setSkip = (attributeId: number) => {
    setDrafts((prev) => {
      const current = prev[attributeId];
      const nextState: DraftState =
        current?.state === 'skip' ? 'untouched' : 'skip';

      return {
        ...prev,
        [attributeId]: {
          attributeId,
          state: nextState,
          value: '',
        },
      };
    });
  };

  const buildSubmitPayload = () => {
    const votes = activeAttributes
      .map((attribute) => {
        const draft = drafts[attribute.id];

        if (!draft || draft.state !== 'vote' || draft.value === '') {
          return null;
        }

        return {
          attribute_key: attribute.key,
          player_id: playerId,
          value: Number(draft.value),
        };
      })
      .filter(Boolean);

    const skipped_attribute_ids = activeAttributes
      .map((attribute) => {
        const draft = drafts[attribute.id];
        return draft?.state === 'skip' ? attribute.id : null;
      })
      .filter((value): value is number => value != null);

    return {
      player_id: playerId,
      votes,
      skipped_attribute_ids,
    };
  };

  const handleSubmit = async () => {
    const payload = buildSubmitPayload();

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch('/api/scout-report', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        cache: 'no-store',
      });

      if (res.status === 401) {
        setRequiresAuth(true);
        setServerAttributes([]);
        return;
      }

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const validationMessage =
          data?.errors?.payload?.[0] ??
          data?.errors?.votes?.[0] ??
          data?.errors?.skipped_attribute_ids?.[0] ??
          data?.message ??
          `Submit failed: ${res.status}`;

        setSubmitError(validationMessage);
        return;
      }

      window.localStorage.removeItem(storageKey);
      setDrafts(emptyDrafts);
      setSubmitError(null);
      setVisible(false);
    } catch {
      setSubmitError('Failed to submit Scout Report.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const playerMeta = [playerName, playerPosition, clubName]
    .filter(Boolean)
    .join(' • ');

  return (
    <>
      <Button type="button" variant="primary" size="md" className={className} onClick={openModal}>
        Scout Report
      </Button>

      {mounted ? (
        <div
          className={[styles.overlay, visible ? styles.overlayVisible : ''].join(' ')}
          onClick={closeModal}
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
                onClick={closeModal}
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
                      className={[buttonStyles.button, buttonStyles.primary, buttonStyles.md, styles.authGateButton].join(' ')}
                    >
                      Log in
                    </Link>

                    <Link
                      href={`/register?redirect=${encodeURIComponent(`/players/${playerId}`)}`}
                      className={[buttonStyles.button, buttonStyles.secondary, buttonStyles.md, styles.authGateButton].join(' ')}
                    >
                      Create account
                    </Link>
                  </div>
                </div>
              ) : isLoadingAttributes ? (
                <div className={styles.loadingState}>
                    <ZLoader/>
                </div>
                ) : attributesError ? (
                <div>{attributesError}</div>
              ) : (
                <>
                  <div className={styles.attributeList}>
                    {activeAttributes.map((attribute) => {
                      const draft = drafts[attribute.id] ?? {
                        attributeId: attribute.id,
                        state: 'untouched' as DraftState,
                        value: '',
                      };

                      const isSkipped = draft.state === 'skip';
                      const isVoted = draft.state === 'vote' && draft.value !== '';
                      const rangeValue = isVoted ? Number(draft.value) : 50;
                      const sliderPercent = `${((rangeValue - 1) / 98) * 100}%`;

                      const sliderStyle = {
                        '--sr-slider-percent': sliderPercent,
                        '--sr-slider-fill': isVoted
                          ? 'var(--ui-accent-primary)'
                          : 'rgba(255, 255, 255, 0.12)',
                      } as CSSProperties;

                      return (
                        <div
                          key={attribute.id}
                          className={[
                            styles.attributeCard,
                            isSkipped ? styles.attributeCardSkipped : '',
                          ].join(' ')}
                        >
                          <div className={styles.attributeRow}>
                            <div className={styles.attributeLead}>
                              <AttributeIcon
                                attributeKey={attribute.key}
                                label={attribute.label}
                                size={18}
                                className={styles.attributeIcon}
                              />
                              <div className={styles.attributeLabel}>
                                {attribute.label}
                              </div>
                            </div>

                            <div className={styles.attributeSliderWrap}>
                              <input
                                type="range"
                                min="1"
                                max="99"
                                value={rangeValue}
                                onChange={(event) =>
                                  setVoteValue(attribute.id, event.target.value)
                                }
                                disabled={isSkipped}
                                className={styles.slider}
                                style={sliderStyle}
                              />

                              <input
                                type="number"
                                min="1"
                                max="99"
                                inputMode="numeric"
                                value={draft.state === 'vote' ? draft.value : ''}
                                onChange={(event) =>
                                  setVoteValue(attribute.id, event.target.value)
                                }
                                disabled={isSkipped}
                                placeholder="1–99"
                                className={styles.numberInput}
                              />
                            </div>

                            <div className={styles.attributeScoreWrap}>
                              <RatingWithConfidence
                                rating={isVoted ? Number(draft.value) : null}
                                confidence={null}
                                showConfidence={false}
                                fontSize={26}
                                scalePx={26}
                                decimals={0}
                                align="center"
                                expand={false}
                                ratingColor={
                                  isVoted
                                    ? getRatingColor(Number(draft.value))
                                    : 'rgba(231, 231, 231, 0.66)'
                                }
                              />
                            </div>

                            <button
                              type="button"
                              className={[
                                styles.skipButton,
                                isSkipped ? styles.skipButtonActive : '',
                              ].join(' ')}
                              onClick={() => setSkip(attribute.id)}
                            >
                              {isSkipped ? 'Skipped' : 'Skip'}
                            </button>
                          </div>
                        </div>
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
                      onClick={handleSubmit}
                    >
                      Submit
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}