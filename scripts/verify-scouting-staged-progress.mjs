import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import {
  VERIFY_MOCK_PAIR,
  buildScoutingProgressResponse,
  installCsrfSupport,
  installVerifyDataMocks,
} from './lib/verify-data-mocks.mjs';

const BASE = process.env.VERIFY_BASE_URL || 'http://localhost:3000';
const SHOT_DIR = join(process.cwd(), 'tmp', 'verify-scouting-staged-progress');
const MY_SCOUTING_UNLOCK = 2;
const YOUR_IMPACT_UNLOCK = 102;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function buildDebugProgress(contributions) {
  return buildScoutingProgressResponse({
    contributions,
    myScoutingUnlock: MY_SCOUTING_UNLOCK,
    yourImpactUnlock: YOUR_IMPACT_UNLOCK,
  }).scouting_progress;
}

async function installStatefulDebugProgress(page, initialContributions = 0) {
  let contributions = initialContributions;

  await installVerifyDataMocks(page);

  await page.route('**/api/scouting/progress**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ scouting_progress: buildDebugProgress(contributions) }),
    });
  });

  await page.route('**/api/votes**', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fallback();
      return;
    }

    contributions += 1;

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ...VERIFY_MOCK_VOTE_RESPONSE,
        scouting_progress: buildDebugProgress(contributions),
      }),
    });
  });

  return {
    getContributions: () => contributions,
    setContributions: (value) => {
      contributions = value;
    },
  };
}

const VERIFY_MOCK_VOTE_RESPONSE = {
  duel_id: 1,
  players: [
    {
      id: 101,
      rating: 91,
      rating_before: 90.5,
      rating_after: 91,
      delta: 0.5,
      votes_count: 100,
      attribute_rank: 3,
      is_top_ten: true,
    },
    {
      id: 102,
      rating: 89,
      rating_before: 89.2,
      rating_after: 89,
      delta: -0.2,
      votes_count: 100,
      attribute_rank: 8,
      is_top_ten: true,
    },
  ],
  popularity: { votes_a: 55, votes_b: 45 },
};

async function readProgressCounter(page) {
  return page.evaluate(() => {
    const bar = document.querySelector('[data-scouting-progress-bar]');
    if (!bar) return null;
    const counter = bar.querySelector('span[aria-hidden="true"]');
    return counter?.textContent?.trim() ?? null;
  });
}

async function capture(page, name) {
  await mkdir(SHOT_DIR, { recursive: true });
  await page.screenshot({ path: join(SHOT_DIR, `${name}.png`), fullPage: true });
}

async function main() {
  const browser = await chromium.launch({ headless: true });

  try {
    {
      const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
      await installStatefulDebugProgress(page, 0);
      await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 180000 });
      await page.waitForSelector('[data-scouting-progress-bar]', { timeout: 120000 });
      const counter = await readProgressCounter(page);
      assert(counter === '0/2', `expected 0/2 on homepage, got ${counter}`);
      await capture(page, 'homepage-0-2');
      await page.close();
    }

    {
      const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
      const state = await installStatefulDebugProgress(page, 1);
      await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 180000 });
      await page.waitForSelector('[data-scouting-progress-bar]', { timeout: 120000 });
      let counter = await readProgressCounter(page);
      assert(counter === '1/2', `expected 1/2 after reload, got ${counter}`);
      await capture(page, 'homepage-1-2-after-reload');
      await page.close();
      assert(state.getContributions() === 1);
    }

    {
      const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
      await installStatefulDebugProgress(page, 1);
      await page.addInitScript(() => {
        window.localStorage.clear();
      });
      await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 180000 });
      await page.waitForSelector('[data-scouting-progress-bar]', { timeout: 120000 });

      await page.route('**/api/votes**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ...VERIFY_MOCK_VOTE_RESPONSE,
            scouting_progress: buildDebugProgress(2),
          }),
        });
      });

      await page.route('**/api/scouting/progress**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ scouting_progress: buildDebugProgress(2) }),
        });
      });

      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForSelector('[data-scouting-progress-bar]', { timeout: 120000 });

      const navLink = page.locator('[data-nav-item="my-scouting"]');
      await navLink.waitFor({ timeout: 120000 });
      const href = await navLink.getAttribute('href');
      assert(href === '/my-scouting', 'My Scouting should be active link after unlock');

      await capture(page, 'homepage-0-100-unlocked');
      await page.close();
    }

    {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      await page.route('**/api/my-scouting**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            scouting_progress: buildDebugProgress(2),
            stats: { duels: 2, players_rated: 2, scout_reports: 0 },
            recent_contributions: [
              {
                type: 'duel',
                id: 'd1',
                attribute_key: 'pace',
                created_at: new Date().toISOString(),
                selected_player_id: 102,
                player_a: { id: 101, name: 'Bukayo Saka', delta: 0.01 },
                player_b: { id: 102, name: 'Jérémy Doku', delta: 0.04 },
              },
              {
                type: 'scout_report',
                id: 'sr-1',
                ratings_count: 6,
                created_at: new Date(Date.now() - 3600000).toISOString(),
                player: { id: 101, name: 'Senne Lammens' },
                overall_before: 77.54,
                overall_after: 77.62,
                overall_delta: 0.08,
              },
            ],
          }),
        });
      });
      await installStatefulDebugProgress(page, 2);
      await page.goto(`${BASE}/my-scouting`, { waitUntil: 'domcontentloaded', timeout: 180000 });
      await page.waitForSelector('text=0 / 100', { timeout: 120000 });
      await page.waitForSelector('text=SCOUT REPORT · 6 RATINGS');

      const contentHeights = await page.evaluate(() => {
        const rows = [...document.querySelectorAll('[class*="contributionRow"]')];
        return rows.map((row) => {
          const top = row.querySelector('[class*="contributionTop"]');
          const bottom = row.querySelector('[class*="duelPlayers"]');
          if (!top || !bottom) return 0;
          const topRect = top.getBoundingClientRect();
          const bottomRect = bottom.getBoundingClientRect();
          return bottomRect.bottom - topRect.top;
        });
      });
      assert(contentHeights.length === 2, 'expected duel and scout report rows');
      assert(
        Math.abs(contentHeights[0] - contentHeights[1]) <= 2,
        `row content heights differ: ${contentHeights.join(', ')}`,
      );

      const centered = await page.evaluate(() => {
        const body = document.querySelector('[class*="duelPlayers"]');
        if (!body) return false;
        const style = getComputedStyle(body);
        return style.justifyContent === 'center';
      });
      assert(centered, 'scout report lower content should be centered');

      await capture(page, 'recent-contributions-desktop');
      await page.setViewportSize({ width: 390, height: 844 });
      await capture(page, 'recent-contributions-mobile-390');
      await page.setViewportSize({ width: 320, height: 568 });
      const overflow = await page.evaluate(
        () => {
          const pageInner = document.querySelector('[class*="pageInner"]');
          const root = pageInner ?? document.documentElement;
          return root.scrollWidth > root.clientWidth + 1;
        },
      );
      assert(!overflow, 'mobile 320 overflow');
      await capture(page, 'recent-contributions-mobile-320');
      await page.close();
    }

    console.log('verify-scouting-staged-progress: OK');
    console.log(`screenshots: ${SHOT_DIR}`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error('verify-scouting-staged-progress: FAILED');
  console.error(error);
  process.exit(1);
});
