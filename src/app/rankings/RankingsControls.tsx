'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import styles from './rankings.module.css';

type Option = { value: string; label: string };
type PendingKind = 'search' | 'filter' | null;

export default function RankingsControls(props: {
  attributeKey: string;
  position: string;
  search: string;
  sort?: string;
  dir?: string;
  attributeOptions: Option[];
  positionOptions: Option[];
  outfieldAttributeOptions: Option[];
  gkAttributeOptions: Option[];
  localSearch?: string;
  onLocalSearchChange?: (value: string) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [internalSearchValue, setInternalSearchValue] = useState(props.search);
  const [pendingKind, setPendingKind] = useState<PendingKind>(null);
  const isFirstSearchEffect = useRef(true);

  const isSearchControlled =
    typeof props.localSearch === 'string' && typeof props.onLocalSearchChange === 'function';

  const searchValue = (isSearchControlled ? props.localSearch : internalSearchValue) ?? '';
  const isFilterPending = isPending && pendingKind === 'filter';
  const hasUnsyncedSearch = searchValue.trim() !== props.search.trim();
  const isSearchPending = isPending && pendingKind === 'search' && hasUnsyncedSearch;

  useEffect(() => {
    if (!isSearchControlled) {
      setInternalSearchValue(props.search);
    }
  }, [props.search, isSearchControlled]);

  useEffect(() => {
    const el = document.getElementById('rankingsShell');
    if (!el) {
      return;
    }

    if (isFilterPending) {
      el.classList.add(styles.shellLoading);
    } else {
      el.classList.remove(styles.shellLoading);
    }

    if (!isPending) {
      setPendingKind(null);
    }
  }, [isPending, isFilterPending]);

  const buildHref = (next: {
    attributeKey?: string;
    position?: string;
    search?: string;
    sort?: string;
    dir?: string;
  }) => {
    const position = next.position ?? props.position;
    const sort = next.sort ?? props.sort ?? '';
    const dir = next.dir ?? props.dir ?? '';
    const allowedAttributeOptions =
      position === 'GK' ? props.gkAttributeOptions : props.outfieldAttributeOptions;
    const allowedAttributeValues = new Set(allowedAttributeOptions.map((o) => o.value));

    const requestedAttributeKey = next.attributeKey;
    let attributeKey = requestedAttributeKey ?? props.attributeKey;

    if (!allowedAttributeValues.has(attributeKey)) {
      attributeKey = 'overall';
    }

    const rawSearch = next.search ?? searchValue;
    const normalizedSearch = rawSearch.trim();

    const qs = new URLSearchParams();

    if (position && position !== 'ALL') {
      qs.set('position', position);
    }

    if (normalizedSearch.length > 0) {
      qs.set('search', normalizedSearch);
    }

    if (sort.length > 0) {
      qs.set('sort', sort);
    }

    if (dir.length > 0) {
      qs.set('dir', dir);
    }

    const suffix = qs.toString() ? `?${qs.toString()}` : '';

    const currentIsIndexRoute = pathname === '/rankings';
    const currentIsDynamicOverallRoute = pathname === '/rankings/overall';
    const autoResetToOverall =
      requestedAttributeKey === undefined &&
      props.attributeKey !== 'overall' &&
      attributeKey === 'overall';

    let basePath = '/rankings';

    if (attributeKey !== 'overall') {
      basePath = `/rankings/${encodeURIComponent(attributeKey)}`;
    } else if (autoResetToOverall && !currentIsIndexRoute) {
      basePath = '/rankings/overall';
    } else if (currentIsDynamicOverallRoute) {
      basePath = '/rankings/overall';
    }

    return `${basePath}${suffix}`;
  };

  const go = (
    next: {
      attributeKey?: string;
      position?: string;
      search?: string;
      sort?: string;
      dir?: string;
    },
    kind: PendingKind
  ) => {
    const href = buildHref(next);
    setPendingKind(kind);

    startTransition(() => {
      if (kind === 'search') {
        router.replace(href);
      } else {
        router.push(href);
      }
    });
  };

  useEffect(() => {
    if (isSearchControlled) {
      return;
    }

    if (isFirstSearchEffect.current) {
      isFirstSearchEffect.current = false;
      return;
    }

    const timer = window.setTimeout(() => {
      go({ search: internalSearchValue }, 'search');
    }, 200);

    return () => window.clearTimeout(timer);
  }, [internalSearchValue, isSearchControlled]);

  return (
    <div className={styles.controlsRow}>
      <div className={styles.control}>
        <div
          style={{
            position: 'relative',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <input
            className={styles.searchInput}
            type="text"
            placeholder="Search player..."
            value={searchValue}
            disabled={isFilterPending}
            style={{ paddingRight: '28px' }}
            onChange={(e) => {
              const nextValue = e.target.value;

              if (isSearchControlled) {
                props.onLocalSearchChange?.(nextValue);
              } else {
                setInternalSearchValue(nextValue);
              }
            }}
          />

          {isSearchPending ? (
            <span
              aria-hidden="true"
              style={{
                position: 'absolute',
                right: '8px',
                width: '12px',
                height: '12px',
                borderRadius: '999px',
                border: '2px solid color-mix(in srgb, var(--ui-text-muted) 55%, transparent)',
                borderTopColor: 'var(--ui-accent-primary)',
                animation: 'spin 0.7s linear infinite',
                pointerEvents: 'none',
              }}
            />
          ) : null}
        </div>
      </div>

      <div className={styles.control}>
        <select
          className={styles.select}
          value={props.attributeKey}
          disabled={isFilterPending}
          onChange={(e) => go({ attributeKey: e.target.value }, 'filter')}
        >
          {props.attributeOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.control}>
        <select
          className={styles.select}
          value={props.position}
          disabled={isFilterPending}
          onChange={(e) => go({ position: e.target.value }, 'filter')}
        >
          {props.positionOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.resetSlot}>
        <button
          type="button"
          className={styles.resetButton}
          disabled={isFilterPending}
          onClick={() => {
            setPendingKind('filter');

            startTransition(() => {
              router.push(pathname === '/rankings' ? '/rankings' : '/rankings/overall');
            });
          }}
        >
          Reset
        </button>
      </div>

      <style jsx>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}