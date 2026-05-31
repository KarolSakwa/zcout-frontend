'use client';

import type { CSSProperties } from 'react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AttributeIcon from '@/components/AttributeIcon';
import RatingWithConfidence from '@/components/RatingWithConfidence';
import ZLoader from '@/components/ZLoader';
import { useAuth } from '@/components/AuthProvider';
import Button from '@/components/ui/Button';
import buttonStyles from '@/components/ui/Button.module.css';
import { getRatingColor } from '@/lib/ratings';
import styles from './ScoutReportTrigger.module.css';
import { logEvent } from '@/lib/telemetry';
import Tooltip from '@/components/Tooltip';
import { attributeDescriptions } from '@/lib/attributeDescriptions';

export type ScoutReportAttribute = {
  id: number;
  key: string;
  label: string;
  group?: string;
  is_skipped?: boolean;
  description?: string;
};

type ScoutReportAttributesResponse = {
  player_id: number;
  items: ScoutReportAttribute[];
  is_completed?: boolean;
  remaining_attributes_count?: number;
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

const ANON_KEY = 'zcout_anon_id';

function readCookie(name: string): string | null {
  const parts = document.cookie.split(';').map((s) => s.trim());
  const hit = parts.find((p) => p.startsWith(`${name}=`));
  if (!hit) return null;
  return decodeURIComponent(hit.substring(name.length + 1));
}

function writeCookie(name: string, value: string, maxAgeSeconds: number) {
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax`;
}

function ensureAnonId(): string | null {
  if (typeof window === 'undefined') return null;

  const fromLs = window.localStorage.getItem(ANON_KEY);
  if (fromLs) {
    writeCookie(ANON_KEY, fromLs, 31536000);
    return fromLs;
  }

  const fromCookie = readCookie(ANON_KEY);
  if (fromCookie) {
    window.localStorage.setItem(ANON_KEY, fromCookie);
    return fromCookie;
  }

  const id = crypto.randomUUID();
  window.localStorage.setItem(ANON_KEY, id);
  writeCookie(ANON_KEY, id, 31536000);
  return id;
}

export default function ScoutReportTrigger({
  playerId,
  playerName,
  playerPosition,
  clubName,
  attributes: _attributes,
  className,
}: ScoutReportTriggerProps) {
  const [isHydrated, setIsHydrated] = useState(false);
  const [isModalMounted, setIsModalMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  const [drafts, setDrafts] = useState<Record<number, AttributeDraft>>({});
  const [serverAttributes, setServerAttributes] = useState<ScoutReportAttribute[] | null>(null);

  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [isLoadingModalAttributes, setIsLoadingModalAttributes] = useState(false);

  const [attributesError, setAttributesError] = useState<string | null>(null);
  const [requiresAuth, setRequiresAuth] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successToastMessage, setSuccessToastMessage] = useState('');

  const [isCompleted, setIsCompleted] = useState(false);
  const [remainingAttributesCount, setRemainingAttributesCount] = useState<number | null>(null);

  const router = useRouter();
  const { user, isAuthResolved } = useAuth();
  const storageKey = `scout-report-draft:${playerId}`;
  const pendingStorageKey = `scout-report-pending:${playerId}`;

  const activeAttributes = serverAttributes ?? [];

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

  const loadScoutReportAvailability = useCallback(
    async (options?: { modal?: boolean }) => {
      const modal = options?.modal === true;

      if (!isAuthResolved) {
        return null;
      }

      if (modal) {
        setIsLoadingModalAttributes(true);
      } else {
        setIsCheckingAvailability(true);
      }

      setAttributesError(null);
      setRequiresAuth(false);

      try {
        if (!user) {
          setServerAttributes(null);
          setIsCompleted(false);
          setRemainingAttributesCount(null);
          setRequiresAuth(true);
          return null;
        }

        const res = await fetch(`/api/scout-report/attributes/${playerId}`, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
          cache: 'no-store',
        });

        if (res.status === 401) {
          setRequiresAuth(true);
          setServerAttributes(null);
          setIsCompleted(false);
          setRemainingAttributesCount(null);
          return null;
        }

        if (!res.ok) {
          throw new Error(`Failed to load Scout Report attributes: ${res.status}`);
        }

        const data = (await res.json()) as ScoutReportAttributesResponse;
        const items = Array.isArray(data.items) ? data.items : [];
        const remaining =
          typeof data.remaining_attributes_count === 'number'
            ? data.remaining_attributes_count
            : items.length;

        setServerAttributes(items);
        setIsCompleted(Boolean(data.is_completed));
        setRemainingAttributesCount(remaining);
        setRequiresAuth(false);

        return data;
      } catch (error) {
        setAttributesError(
          error instanceof Error ? error.message : 'Failed to load Scout Report.'
        );
        setServerAttributes(null);
        setIsCompleted(false);
        setRemainingAttributesCount(null);
        return null;
      } finally {
        if (modal) {
          setIsLoadingModalAttributes(false);
        } else {
          setIsCheckingAvailability(false);
        }
      }
    },
    [isAuthResolved, playerId, user]
  );

  useEffect(() => {
    setIsHydrated(true);
    ensureAnonId();
  }, []);

  useEffect(() => {
    if (!isHydrated || !isAuthResolved) return;

    if (!user) {
      setServerAttributes(null);
      setIsCompleted(false);
      setRemainingAttributesCount(null);
      setRequiresAuth(true);
      setIsCheckingAvailability(false);
      return;
    }

    void loadScoutReportAvailability();
  }, [isHydrated, isAuthResolved, user, loadScoutReportAvailability]);

  useEffect(() => {
  if (!isHydrated) {
    return;
  }

  if (!activeAttributes.length) {
    return;
  }

  const raw = window.localStorage.getItem(storageKey);

  if (!raw) {
    setDrafts((prev) => {
      const next = emptyDrafts;

      const prevJson = JSON.stringify(prev);
      const nextJson = JSON.stringify(next);

      return prevJson === nextJson ? prev : next;
    });

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

    setDrafts((prev) => {
      const prevJson = JSON.stringify(prev);
      const nextJson = JSON.stringify(normalized);

      return prevJson === nextJson ? prev : normalized;
    });
  } catch {
    setDrafts((prev) => {
      const next = emptyDrafts;

      const prevJson = JSON.stringify(prev);
      const nextJson = JSON.stringify(next);

      return prevJson === nextJson ? prev : next;
    });
  }
}, [isHydrated, activeAttributes, storageKey, emptyDrafts]);

  useEffect(() => {
    if (!isHydrated) return;

    if (!hasActions) {
      window.localStorage.removeItem(storageKey);
      return;
    }

    window.localStorage.setItem(storageKey, JSON.stringify(drafts));
  }, [drafts, isHydrated, storageKey, hasActions]);

  useEffect(() => {
    if (!isModalMounted) return;

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
  }, [isModalMounted, isSubmitting]);

  useEffect(() => {
    if (!isModalMounted || visible) return;

    const timeout = window.setTimeout(() => {
      setIsModalMounted(false);
    }, 180);

    return () => window.clearTimeout(timeout);
  }, [isModalMounted, visible]);

  useEffect(() => {
    if (!showSuccessToast) return;

    const timeout = window.setTimeout(() => {
      setShowSuccessToast(false);
    }, 5000);

    return () => window.clearTimeout(timeout);
  }, [showSuccessToast]);

  if (isAuthResolved && !user) {
    return (
      <Link
        href={`/login?redirect=${encodeURIComponent(`/players/${playerId}`)}`}
        className={[
          buttonStyles.button,
          buttonStyles.primary,
          buttonStyles.md,
          className ?? '',
        ].join(' ')}
      >
        Scout Report
      </Link>
    );
  }

  const openModal = () => {
    if (isCompleted) return;

    setSubmitError(null);
    setAttributesError(null);

    logEvent('scout_report_opened', {
      player_id: playerId,
    });

    setIsModalMounted(true);

    if (!isAuthResolved || !user) {
      setRequiresAuth(true);
      setServerAttributes(null);
      setIsCompleted(false);
      setRemainingAttributesCount(null);
      setIsLoadingModalAttributes(false);
      return;
    }

    setRequiresAuth(false);
    void loadScoutReportAvailability({ modal: true });

    setIsModalMounted(true);

    window.dispatchEvent(
      new CustomEvent('zcout:scout-report-opened')
    );
  };

  const closeModal = () => {
    if (isSubmitting) return;

    window.dispatchEvent(
      new CustomEvent('zcout:scout-report-closed')
    );

    setVisible(false);
  };

  const reopenForNextPack = () => {
    if (isCompleted || remainingAttributesCount === 0) {
      setShowSuccessToast(false);
      return;
    }

    setShowSuccessToast(false);
    setSubmitError(null);
    setAttributesError(null);
    setRequiresAuth(false);
    setIsModalMounted(true);
    void loadScoutReportAvailability({ modal: true });
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
          value: Number(draft.value),
        };
      })
      .filter((value): value is { attribute_key: string; value: number } => value != null);

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

  const getJustSubmittedVotedAttributeIds = () => {
    return activeAttributes
      .filter((attribute) => {
        const draft = drafts[attribute.id];
        return draft?.state === 'vote' && draft.value !== '';
      })
      .map((attribute) => attribute.id);
  };

  const getJustSubmittedRatingsMap = () => {
    return Object.fromEntries(
      activeAttributes
        .map((attribute) => {
          const draft = drafts[attribute.id];

          if (!draft || draft.state !== 'vote' || draft.value === '') {
            return null;
          }

          return [attribute.id, Number(draft.value)] as const;
        })
        .filter((entry): entry is readonly [number, number] => entry != null)
    );
  };

  const handleSubmit = async () => {
    const payload = buildSubmitPayload();
    const justSubmittedRatings = getJustSubmittedRatingsMap();

    if (Object.keys(justSubmittedRatings).length > 0) {
      window.dispatchEvent(
        new CustomEvent('zcout:scout-report-saving', {
          detail: {
            playerId,
            ratings: justSubmittedRatings,
          },
        })
      );
    }

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
        if (Object.keys(justSubmittedRatings).length > 0) {
          window.dispatchEvent(
            new CustomEvent('zcout:scout-report-failed', {
              detail: {
                playerId,
              },
            })
          );
        }

        setRequiresAuth(true);
        setServerAttributes(null);
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

        if (Object.keys(justSubmittedRatings).length > 0) {
          window.dispatchEvent(
            new CustomEvent('zcout:scout-report-failed', {
              detail: {
                playerId,
              },
            })
          );
        }

        setSubmitError(validationMessage);
        return;
      }

      logEvent('scout_report_submitted', {
        player_id: playerId,
        voted_attribute_ids: payload.votes.map((vote) => {
          const attribute = activeAttributes.find((item) => item.key === vote.attribute_key);
          return attribute?.id ?? null;
        }).filter((value): value is number => value !== null),
        skipped_attribute_ids: payload.skipped_attribute_ids,
        votes_count: payload.votes.length,
        skips_count: payload.skipped_attribute_ids.length,
      });

      window.localStorage.removeItem(storageKey);

      const justSubmittedVotedAttributeIds = getJustSubmittedVotedAttributeIds();

      if (justSubmittedVotedAttributeIds.length > 0) {
        window.sessionStorage.setItem(
          pendingStorageKey,
          JSON.stringify({
            attributeIds: justSubmittedVotedAttributeIds,
            createdAt: Date.now(),
          })
        );
      } else {
        window.sessionStorage.removeItem(pendingStorageKey);
      }

      if (Object.keys(justSubmittedRatings).length > 0) {
        window.dispatchEvent(
          new CustomEvent('zcout:scout-report-saved', {
            detail: {
              playerId,
              ratings: justSubmittedRatings,
            },
          })
        );
      }

      setDrafts(emptyDrafts);
      setSubmitError(null);
      setAttributesError(null);
      setRequiresAuth(false);

      const submittedVotesCount = payload.votes.length;
      const shouldCompleteOptimistically =
        remainingAttributesCount !== null &&
        payload.skipped_attribute_ids.length === 0 &&
        submittedVotesCount > 0 &&
        submittedVotesCount === remainingAttributesCount;

      if (shouldCompleteOptimistically) {
        setServerAttributes([]);
        setIsCompleted(true);
        setRemainingAttributesCount(0);
      } else {
        void loadScoutReportAvailability();
      }

      setVisible(false);
      setIsModalMounted(false);
      setSuccessToastMessage('Scout Report saved.');
      setShowSuccessToast(true);
      router.refresh();
      return;
    } catch {
      if (Object.keys(justSubmittedRatings).length > 0) {
        window.dispatchEvent(
          new CustomEvent('zcout:scout-report-failed', {
            detail: {
              playerId,
            },
          })
        );
      }

      setSubmitError('Failed to submit Scout Report.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const playerMeta = [playerName, playerPosition, clubName]
    .filter(Boolean)
    .join(' • ');

  const showCompletedBadge =
    isAuthResolved &&
    Boolean(user) &&
    isCompleted &&
    remainingAttributesCount === 0;

  return (
    <>
      {showCompletedBadge ? (
        <div
          className={className}
          style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 34,
          padding: '0 16px',
          borderRadius: 12,
          border: '1px solid rgba(107, 214, 160, 0.32)',
          background: 'rgba(107, 214, 160, 0.12)',
          color: '#9ae6b4',
          fontSize: 12,
          fontWeight: 800,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          boxShadow: '0 10px 22px rgba(0, 0, 0, 0.16)',
          cursor: 'default',
        }}
        >
          Scouted ✓
        </div>
      ) : (
        <Button type="button" variant="primary" size="md" className={className} onClick={openModal}>
          Scout Report
        </Button>
      )}

      {isModalMounted ? (
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
                            <Tooltip
                              content={attributeDescriptions[attribute.key] ?? ''}
                            >
                              <div
                                className={styles.attributeLead}
                                style={{ cursor: 'help' }}
                              >
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
                            </Tooltip>

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

      {showSuccessToast ? (
        <div className={styles.successToast}>
          <div className={styles.successToastText}>{successToastMessage}</div>
        </div>
      ) : null}
    </>
  );
}