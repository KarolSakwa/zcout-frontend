import { useCallback, useEffect, useState } from 'react';
import type { PairResponse } from './duelTypes';
import { ATTR_MAP } from './duelUtils';
import type { RecentVoteItem } from './RecentVotesWidget';
import type { TopRiserItem } from './TopRisersWidget';

type TopRisersMode = 'risers' | 'fallers';

const recentVotesPool: RecentVoteItem[] = [
  { id: 'rv-1', winner: 'Bukayo Saka', loser: 'Phil Foden', winnerPlayerId: 1, loserPlayerId: 2, attributeKey: 'dribbling', attributeLabel: 'Dribbling' },
  { id: 'rv-2', winner: 'Rodri', loser: 'Declan Rice', winnerPlayerId: 3, loserPlayerId: 4, attributeKey: 'passing', attributeLabel: 'Passing' },
  { id: 'rv-3', winner: 'Virgil van Dijk', loser: 'William Saliba', winnerPlayerId: 5, loserPlayerId: 6, attributeKey: 'marking', attributeLabel: 'Marking' },
  { id: 'rv-4', winner: 'Cole Palmer', loser: 'Martin Odegaard', winnerPlayerId: 7, loserPlayerId: 8, attributeKey: 'creativity', attributeLabel: 'Creativity' },
  { id: 'rv-5', winner: 'Erling Haaland', loser: 'Alexander Isak', winnerPlayerId: 9, loserPlayerId: 10, attributeKey: 'finishing', attributeLabel: 'Finishing' },
  { id: 'rv-6', winner: 'Bruno Fernandes', loser: 'James Maddison', winnerPlayerId: 11, loserPlayerId: 12, attributeKey: 'long_shots', attributeLabel: 'Long Shots' },
  { id: 'rv-7', winner: 'Mohamed Salah', loser: 'Jarrod Bowen', winnerPlayerId: 13, loserPlayerId: 14, attributeKey: 'acceleration', attributeLabel: 'Acceleration' },
  { id: 'rv-8', winner: 'Gabriel Magalhaes', loser: 'Cristian Romero', winnerPlayerId: 15, loserPlayerId: 16, attributeKey: 'heading', attributeLabel: 'Heading' },
];

const topRisersMock: TopRiserItem[] = [
  { id: 'tr-1', playerId: 101, player: 'Cole Palmer', attributeKey: 'creativity', attributeLabel: 'Creativity', delta: '+0.42' },
  { id: 'tr-2', playerId: 102, player: 'Alexander Isak', attributeKey: 'finishing', attributeLabel: 'Finishing', delta: '+0.37' },
  { id: 'tr-3', playerId: 103, player: 'Milos Kerkez', attributeKey: 'acceleration', attributeLabel: 'Acceleration', delta: '+0.31' },
  { id: 'tr-4', playerId: 104, player: 'Morgan Rogers', attributeKey: 'dribbling', attributeLabel: 'Dribbling', delta: '+0.28' },
  { id: 'tr-5', playerId: 105, player: 'Morgan Gibbs-White', attributeKey: 'passing', attributeLabel: 'Passing', delta: '+0.24' },
];

const topFallersMock: TopRiserItem[] = [
  { id: 'tf-1', playerId: 201, player: 'Casemiro', attributeKey: 'stamina', attributeLabel: 'Stamina', delta: '-0.39' },
  { id: 'tf-2', playerId: 202, player: 'Raheem Sterling', attributeKey: 'acceleration', attributeLabel: 'Acceleration', delta: '-0.34' },
  { id: 'tf-3', playerId: 203, player: 'Kalvin Phillips', attributeKey: 'passing', attributeLabel: 'Passing', delta: '-0.29' },
  { id: 'tf-4', playerId: 204, player: 'Ben Chilwell', attributeKey: 'crossing', attributeLabel: 'Crossing', delta: '-0.23' },
  { id: 'tf-5', playerId: 205, player: 'Jordan Henderson', attributeKey: 'work_rate', attributeLabel: 'Work Rate', delta: '-0.20' },
];

function getTodayKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function pickDailyTopRisersMode(): TopRisersMode {
  return Math.random() < 0.6 ? 'risers' : 'fallers';
}

function formatAttributeLabel(attribute: string) {
  return attribute
    .replace(/^gk_/i, '')
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function useDuelSideWidgets(pair: PairResponse | null) {
  const [recentVotesItems, setRecentVotesItems] = useState<RecentVoteItem[]>(() => recentVotesPool.slice(0, 5));
  const [latestRecentVoteId, setLatestRecentVoteId] = useState<string | null>(null);
  const [topRisersMode, setTopRisersMode] = useState<TopRisersMode>('risers');

  useEffect(() => {
    let index = 5;

    const interval = window.setInterval(() => {
      const nextItem = recentVotesPool[index % recentVotesPool.length];
      index += 1;

      setLatestRecentVoteId(nextItem.id);
      setRecentVotesItems((prev) => [nextItem, ...prev.filter((entry) => entry.id !== nextItem.id)].slice(0, 5));
    }, 6000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const storageKey = 'zcout-duels-side-widget-mode';
    const today = getTodayKey();

    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as { day: string; mode: TopRisersMode };
        if (parsed.day === today && (parsed.mode === 'risers' || parsed.mode === 'fallers')) {
          setTopRisersMode(parsed.mode);
          return;
        }
      }
    } catch {}

    const nextMode = pickDailyTopRisersMode();
    setTopRisersMode(nextMode);

    try {
      window.localStorage.setItem(storageKey, JSON.stringify({ day: today, mode: nextMode }));
    } catch {}
  }, []);

  const pushRecentVoteMock = useCallback(
    (winnerId: number) => {
      if (!pair) return;

      const winner = winnerId === pair.left.id ? pair.left : pair.right;
      const loser = winnerId === pair.left.id ? pair.right : pair.left;

      const attributeKey =
        ATTR_MAP[String(pair.attribute ?? 'DRI').toUpperCase()] ?? String(pair.attribute ?? 'dribbling').toLowerCase();

      const item: RecentVoteItem = {
        id: `local-${winner.id}-${loser.id}-${attributeKey}`,
        winner: winner.name,
        loser: loser.name,
        winnerPlayerId: winner.id,
        loserPlayerId: loser.id,
        attributeKey,
        attributeLabel: formatAttributeLabel(attributeKey),
      };

      setLatestRecentVoteId(item.id);
      setRecentVotesItems((prev) =>
        [
          item,
          ...prev.filter(
            (entry) =>
              !(
                entry.winner === item.winner &&
                entry.loser === item.loser &&
                entry.attributeKey === item.attributeKey
              )
          ),
        ].slice(0, 5)
      );
    },
    [pair]
  );

  const topRisersItems = topRisersMode === 'risers' ? topRisersMock : topFallersMock;

  return {
    recentVotesItems,
    latestRecentVoteId,
    topRisersItems,
    topRisersMode,
    pushRecentVoteMock,
  };
}