'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import Button from '@/components/ui/Button';
import buttonStyles from '@/components/ui/Button.module.css';
import styles from './ScoutReportTrigger.module.css';
import { logEvent } from '@/lib/telemetry';
import ScoutReportModal from './ScoutReportModal';
import { useScoutReportDrafts } from './useScoutReportDrafts';
import { useScoutReportSubmit } from './useScoutReportSubmit';

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
  className,
}: ScoutReportTriggerProps) {
  const [isHydrated, setIsHydrated] = useState(false);
  const [isModalMounted, setIsModalMounted] = useState(false);

  const [serverAttributes, setServerAttributes] = useState<ScoutReportAttribute[] | null>(null);

  const [isLoadingModalAttributes, setIsLoadingModalAttributes] = useState(false);

  const [attributesError, setAttributesError] = useState<string | null>(null);
  const [requiresAuth, setRequiresAuth] = useState(false);

  const [isCompleted, setIsCompleted] = useState(false);
  const [remainingAttributesCount, setRemainingAttributesCount] = useState<number | null>(null);

  const router = useRouter();
  const { user, isAuthResolved } = useAuth();
  const pendingStorageKey = `scout-report-pending:${playerId}`;

  const activeAttributes = serverAttributes ?? [];

  const {
    drafts,
    hasActions,
    setVoteValue,
    setSkip,
    buildSubmitPayload,
    getJustSubmittedRatingsMap,
    getJustSubmittedVotedAttributeIds,
    resetDrafts,
    clearDraftStorage,
  } = useScoutReportDrafts({
    playerId,
    attributes: activeAttributes,
    isHydrated,
  });

  const loadScoutReportAvailability = useCallback(
    async (options?: { modal?: boolean }) => {
      const modal = options?.modal === true;

      if (!isAuthResolved) {
        return null;
      }

      if (modal) {
        setIsLoadingModalAttributes(true);
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
        }
      }
    },
    [isAuthResolved, playerId, user]
  );

  const {
    isSubmitting,
    submitError,
    showSuccessToast,
    successToastMessage,
    handleSubmit,
    clearSubmitError,
  } = useScoutReportSubmit({
    playerId,
    activeAttributes,
    buildSubmitPayload,
    getJustSubmittedRatingsMap,
    getJustSubmittedVotedAttributeIds,
    resetDrafts,
    clearDraftStorage,
    remainingAttributesCount,
    reloadAttributes: () => loadScoutReportAvailability(),
    onSuccessClose: () => setIsModalMounted(false),
    pendingStorageKey,
    onUnauthorized: () => {
      setRequiresAuth(true);
      setServerAttributes(null);
    },
    onSubmitSuccess: (optimisticComplete) => {
      setAttributesError(null);
      setRequiresAuth(false);

      if (optimisticComplete) {
        setServerAttributes([]);
        setIsCompleted(true);
        setRemainingAttributesCount(0);
      }
    },
    refreshRouter: () => router.refresh(),
  });

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
      return;
    }

    void loadScoutReportAvailability();
  }, [isHydrated, isAuthResolved, user, loadScoutReportAvailability]);

  const handleModalUserClose = useCallback(() => {
    window.dispatchEvent(
      new CustomEvent('zcout:scout-report-closed')
    );
  }, []);

  const handleModalExitComplete = useCallback(() => {
    setIsModalMounted(false);
  }, []);

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

    clearSubmitError();
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

      <ScoutReportModal
        isMounted={isModalMounted}
        isSubmitting={isSubmitting}
        playerId={playerId}
        playerMeta={playerMeta}
        requiresAuth={requiresAuth}
        isLoadingModalAttributes={isLoadingModalAttributes}
        attributesError={attributesError}
        attributes={activeAttributes}
        drafts={drafts}
        submitError={submitError}
        hasActions={hasActions}
        onUserClose={handleModalUserClose}
        onExitComplete={handleModalExitComplete}
        onVoteChange={setVoteValue}
        onSkipToggle={setSkip}
        onSubmit={handleSubmit}
      />

      {showSuccessToast ? (
        <div className={styles.successToast}>
          <div className={styles.successToastText}>{successToastMessage}</div>
        </div>
      ) : null}
    </>
  );
}