import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import {
  buildMyScoutingResponse,
  buildScoutingProgressResponse,
  installMyScoutingMock,
  installPlayerProfileMocks,
  installScoutingProgressMock,
  VERIFY_MOCK_AUTH_USER,
} from './lib/verify-data-mocks.mjs';
import {
  assertDesktopPrimaryGrid,
  assertMobileStackOrder,
  assertNoHorizontalOverflow,
  collectMyScoutingPrimaryGridMetrics,
} from './lib/verify-my-scouting-primary-grid.mjs';

const BASE = process.env.VERIFY_BASE_URL || 'http://localhost:3000';
const SHOT_DIR = join(process.cwd(), 'tmp', 'verify-my-scouting-layout');

const VIEWPORTS = [
  { name: 'desktop-1440', width: 1440, height: 900 },
  { name: 'desktop-1280', width: 1280, height: 720 },
  { name: 'tablet-1024', width: 1024, height: 768 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'mobile-390', width: 390, height: 844 },
  { name: 'mobile-320', width: 320, height: 568 },
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function capture(page, name) {
  await mkdir(SHOT_DIR, { recursive: true });
  await page.screenshot({ path: join(SHOT_DIR, `${name}.png`), fullPage: true });
}

async function gotoMyScouting(page) {
  await page.goto(`${BASE}/my-scouting`, {
    waitUntil: 'domcontentloaded',
    timeout: 180000,
  });
  await page.waitForSelector('h1', { timeout: 60000 });
}

async function waitForLocked(page) {
  await page.waitForSelector('text=24 / 25', { timeout: 60000 });
}

async function waitForDashboard(page) {
  await page.waitForSelector('text=DUELS', { timeout: 60000 });
}

async function assertPageNoHorizontalOverflow(page) {
  const layout = await collectMyScoutingPrimaryGridMetrics(page);
  assertNoHorizontalOverflow(layout, 'page');
}

async function assertPrimaryGridLayout(page, viewportName, width) {
  const layout = await collectMyScoutingPrimaryGridMetrics(page);
  if (width >= 1200) {
    assertDesktopPrimaryGrid(layout, viewportName);
  } else {
    assertMobileStackOrder(layout, viewportName);
  }
  assertNoHorizontalOverflow(layout, viewportName);
}

async function installLocked(page, contributions = 18) {
  await installScoutingProgressMock(
    page,
    buildScoutingProgressResponse({ contributions, unlocked: false }),
  );
}

async function installUnlockedDashboard(page, response) {
  const payload = response ?? buildMyScoutingResponse();
  await installScoutingProgressMock(page, { scouting_progress: payload.scouting_progress });
  await installMyScoutingMock(page, payload);
}

const duelContribution = {
  type: 'duel',
  id: 'duel-1',
  attribute_key: 'pace',
  created_at: new Date().toISOString(),
  selected_player_id: 102,
  player_a: { id: 101, name: 'Bukayo Saka', delta: 0.01 },
  player_b: { id: 102, name: 'Jérémy Doku', delta: 0.04 },
};

const scoutReportContribution = {
  type: 'scout_report',
  id: 'sr-1',
  ratings_count: 6,
  created_at: new Date(Date.now() - 3600000).toISOString(),
  player: { id: 101, name: 'Bukayo Saka' },
  overall_before: 83.74,
  overall_after: 83.89,
  overall_delta: 0.15,
};

async function main() {
  const browser = await chromium.launch({ headless: true });
  const results = [];

  try {
    {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      await installLocked(page, 24);
      await gotoMyScouting(page);
      await waitForLocked(page);
      await capture(page, 'locked-below-25');
      await page.close();
      results.push('locked below 25');
    }

    {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      await installUnlockedDashboard(page);
      await gotoMyScouting(page);
      await waitForDashboard(page);
      await capture(page, 'dashboard-anon-unlocked');
      await page.close();
      results.push('anon dashboard unlocked');
    }

    {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      await installPlayerProfileMocks(page);
      await installUnlockedDashboard(page);
      await gotoMyScouting(page);
      await waitForDashboard(page);
      assert((await page.locator('text=TEMPORARY SCOUTING RECORD').count()) === 0);
      await capture(page, 'dashboard-logged-user');
      await page.close();
      results.push('logged dashboard without temporary record');
    }

    {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      await installUnlockedDashboard(
        page,
        buildMyScoutingResponse({
          stats: { duels: 10, players_rated: 8, scout_reports: 0 },
        }),
      );
      await gotoMyScouting(page);
      await waitForDashboard(page);
      await page.waitForSelector('text=SCOUT REPORTS');
      await capture(page, 'scout-reports-zero');
      await page.close();
      results.push('scout reports zero card');
    }

    {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      await installUnlockedDashboard(
        page,
        buildMyScoutingResponse({
          recentContributions: Array.from({ length: 5 }, (_, index) => ({
            ...duelContribution,
            id: `duel-${index}`,
            created_at: new Date(Date.now() - index * 60000).toISOString(),
          })),
        }),
      );
      await gotoMyScouting(page);
      await waitForDashboard(page);
      await page.waitForSelector('text=DUEL · PACE');
      await capture(page, 'five-duel-contributions');
      await page.close();
      results.push('five duel contributions');
    }

    {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      await installUnlockedDashboard(
        page,
        buildMyScoutingResponse({
          recentContributions: [duelContribution, scoutReportContribution],
        }),
      );
      await gotoMyScouting(page);
      await waitForDashboard(page);
      await page.waitForSelector('text=SCOUT REPORT · 6 RATINGS');
      await capture(page, 'mixed-contributions');
      await page.close();
      results.push('mixed contributions');
    }

    {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      await installUnlockedDashboard(
        page,
        buildMyScoutingResponse({ recentContributions: [duelContribution] }),
      );
      await gotoMyScouting(page);
      await waitForDashboard(page);
      await page.waitForSelector('text=★');
      assert((await page.locator('text=Your pick').count()) === 0);
      await capture(page, 'selected-player-star');
      await page.close();
      results.push('selected player star');
    }

    {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      await installUnlockedDashboard(
        page,
        buildMyScoutingResponse({ contributions: 134, unlocked: true }),
      );
      await gotoMyScouting(page);
      await waitForDashboard(page);
      await page.waitForSelector('text=100 / 100');
      await page.waitForSelector('text=YOUR IMPACT');
      await capture(page, 'contributions-134-capped');
      await page.close();
      results.push('contributions 134 capped');
    }

    {
      const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
      await installScoutingProgressMock(
        page,
        buildScoutingProgressResponse({ contributions: 30, unlocked: true }),
      );
      await page.route('**/api/my-scouting**', (route) =>
        route.fulfill({ status: 500, body: '{}' }),
      );
      await gotoMyScouting(page);
      await page.waitForSelector("text=We couldn't load your scouting record.");
      await capture(page, 'dashboard-error');
      await page.close();
      results.push('dashboard error state');
    }

    for (const viewport of VIEWPORTS) {
      const page = await browser.newPage({
        viewport: { width: viewport.width, height: viewport.height },
      });
      await installUnlockedDashboard(
        page,
        buildMyScoutingResponse({
          recentContributions: Array.from({ length: 5 }, (_, index) => ({
            ...duelContribution,
            id: `layout-duel-${index}`,
            created_at: new Date(Date.now() - index * 60000).toISOString(),
          })),
        }),
      );
      await gotoMyScouting(page);
      await waitForDashboard(page);
      await assertPrimaryGridLayout(page, viewport.name, viewport.width);
      await capture(page, `layout-${viewport.name}`);
      await page.close();
      results.push(`layout ${viewport.name}`);
    }

    {
      const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
      await installLocked(page, 24);
      await gotoMyScouting(page);
      await waitForLocked(page);
      const response = await page.goto(`${BASE}/my-scouting`, {
        waitUntil: 'domcontentloaded',
      });
      assert(response && response.status() < 500, 'my-scouting route should not 404');
      await page.close();
      results.push('route not 404');
    }

    console.log('verify-my-scouting-layout: OK');
    for (const line of results) console.log(`  - ${line}`);
    console.log(`screenshots: ${SHOT_DIR}`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error('verify-my-scouting-layout: FAILED');
  console.error(error);
  process.exit(1);
});
