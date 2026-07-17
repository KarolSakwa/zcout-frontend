'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export const HOMEPAGE_LOADING_SECTIONS = [
  'topRisers',
  'featuredRanking',
  'recentVotes',
  'needsMoreRatings',
  'duel',
] as const;

export type HomepageLoadingSection = (typeof HOMEPAGE_LOADING_SECTIONS)[number];

type LoadingMap = Record<HomepageLoadingSection, boolean>;

const initialLoading: LoadingMap = {
  topRisers: true,
  featuredRanking: true,
  recentVotes: true,
  needsMoreRatings: true,
  duel: true,
};

type HomepageLoadingContextValue = {
  isHomepageReady: boolean;
  setSectionLoading: (section: HomepageLoadingSection, isLoading: boolean) => void;
};

const HomepageLoadingContext = createContext<HomepageLoadingContextValue | null>(
  null,
);

export function HomepageLoadingProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState<LoadingMap>(initialLoading);

  const setSectionLoading = useCallback(
    (section: HomepageLoadingSection, isLoading: boolean) => {
      setLoading((prev) => {
        if (prev[section] === isLoading) return prev;
        return { ...prev, [section]: isLoading };
      });
    },
    [],
  );

  const isHomepageReady = useMemo(
    () => HOMEPAGE_LOADING_SECTIONS.every((section) => !loading[section]),
    [loading],
  );

  const value = useMemo(
    () => ({ isHomepageReady, setSectionLoading }),
    [isHomepageReady, setSectionLoading],
  );

  return (
    <HomepageLoadingContext.Provider value={value}>
      {children}
    </HomepageLoadingContext.Provider>
  );
}

export function useHomepageLoading() {
  const context = useContext(HomepageLoadingContext);

  if (!context) {
    throw new Error('useHomepageLoading must be used within HomepageLoadingProvider');
  }

  return context;
}

/** Returns `isHomepageReady` when inside the provider; defaults to `true` elsewhere. */
export function useIsHomepageReady(): boolean {
  const context = useContext(HomepageLoadingContext);
  return context?.isHomepageReady ?? true;
}

export function useHomepageSectionLoading(
  section: HomepageLoadingSection,
  isLoading: boolean,
  enabled = true,
) {
  const context = useContext(HomepageLoadingContext);

  useEffect(() => {
    if (!enabled || !context) return;
    context.setSectionLoading(section, isLoading);
  }, [context, enabled, isLoading, section]);
}
