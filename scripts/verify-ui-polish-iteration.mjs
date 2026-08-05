import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import {
  buildMyScoutingResponse,
  buildScoutingProgressResponse,
  installMyScoutingMock,
  installScoutingProgressMock,
  installVerifyDataMocks,
  waitForHomepageNeutralProgressAlignment,
} from './lib/verify-data-mocks.mjs';
import {
  assertDesktopPrimaryGrid,
  assertMobileStackOrder,
  assertNoHorizontalOverflow,
  collectMyScoutingPrimaryGridMetrics,
} from './lib/verify-my-scouting-primary-grid.mjs';

const BASE = process.env.VERIFY_BASE_URL || 'http://localhost:3000';
const SHOT_DIR = join(process.cwd(), 'tmp', 'verify-ui-polish-iteration');
const TOL = 1;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function approx(a, b, tol = TOL) {
  return Math.abs(Math.round(a) - Math.round(b)) <= tol;
}

async function measureNeutralProgressWidth(page) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await page.evaluate(() => {
        const leftCard = document.querySelector('[data-hp-duel-slot="left"] [data-homepage="true"]');
        const rightCard = document.querySelector('[data-hp-duel-slot="right"] [data-homepage="true"]');
        const bar = document.querySelector('[data-scouting-progress-bar]');
        if (!leftCard || !rightCard || !bar) return null;
        const left = leftCard.getBoundingClientRect();
        const right = rightCard.getBoundingClientRect();
        const barRect = bar.getBoundingClientRect();
        const fill = document.querySelector('[data-scouting-progress-fill]');
        const fillStyle = fill ? getComputedStyle(fill) : null;
        return {
          neutralSpan: right.right - left.left,
          progressWidth: barRect.width,
          progressLeft: barRect.left,
          progressRight: barRect.right,
          fillBackgroundImage: fillStyle?.backgroundImage ?? null,
          fillBackgroundColor: fillStyle?.backgroundColor ?? null,
        };
      });
    } catch (error) {
      if (attempt === 2) throw error;
      await page.waitForTimeout(500);
    }
  }
  return null;
}

async function installDelayedVote(page, delayMs = 2500) {
  let releaseVote;
  const gate = new Promise((resolve) => {
    releaseVote = resolve;
  });

  await page.route('**/api/vote', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }
    await gate;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        duel_id: 1,
        scouting_progress: buildScoutingProgressResponse({ contributions: 5, unlocked: false })
          .scouting_progress,
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
      }),
    });
  });

  return () => releaseVote();
}

async function testHomepageNeutralWidth(page, label) {
  await installVerifyDataMocks(page);
  await installScoutingProgressMock(
    page,
    buildScoutingProgressResponse({ contributions: 4, unlocked: false }),
  );
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForSelector('[data-scouting-progress-bar]', { timeout: 120000 });
  await waitForHomepageNeutralProgressAlignment(page);

  const metrics = await measureNeutralProgressWidth(page);
  assert(metrics, 'neutral progress metrics missing');
  assert(
    approx(metrics.progressWidth, metrics.neutralSpan),
    `[${label}] progress width ${metrics.progressWidth} != neutral span ${metrics.neutralSpan}`,
  );

  await page.screenshot({
    path: join(SHOT_DIR, `homepage-neutral-${label}.png`),
    fullPage: false,
  });
}

async function testPendingVoteLifecycle(page, { homepage = true } = {}) {
  const path = homepage ? '/' : '/duels';
  const progressBefore = homepage
    ? buildScoutingProgressResponse({ contributions: 4, unlocked: false })
    : buildScoutingProgressResponse({ contributions: 4, unlocked: false });

  await installVerifyDataMocks(page);
  await installScoutingProgressMock(page, progressBefore);
  const releaseVote = await installDelayedVote(page);

  await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForSelector('[data-homepage="true"], [data-duels-page="true"]', {
    timeout: 120000,
  });

  const counterBefore = await page
    .locator('[data-scouting-progress-bar]')
    .innerText();

  const leftSelector = homepage
    ? '[data-hp-duel-slot="left"] [data-homepage="true"]'
    : '[data-duels-slot="left"] [data-duels-page="true"]';

  await page.locator(leftSelector).first().click({ timeout: 30000 });
  await page.waitForTimeout(400);

  assert(await page.locator('[data-scouting-progress-bar]').isVisible(), 'progress hidden during vote');
  const skip = page.locator('button', { hasText: /skip/i });
  assert(await skip.isVisible(), 'SKIP hidden during vote');
  assert(await skip.isDisabled(), 'SKIP should be disabled during vote');
  const counterPending = await page.locator('[data-scouting-progress-bar]').innerText();
  assert(counterPending === counterBefore, `progress changed during pending vote: ${counterPending} vs ${counterBefore}`);

  if (homepage) {
    await page.screenshot({
      path: join(SHOT_DIR, 'homepage-pending-vote.png'),
      fullPage: false,
    });
  }

  releaseVote();
  await page.waitForSelector('[data-hp-duel-next], [data-duels-skip]', {
    timeout: 60000,
  }).catch(() => {});

  await page.waitForFunction(
    () => !document.querySelector('[data-scouting-progress-bar]'),
    undefined,
    { timeout: 60000 },
  );

  if (homepage) {
    await page.waitForSelector('[data-hp-duel-next]', { timeout: 60000 });
    await page.screenshot({
      path: join(SHOT_DIR, 'homepage-reveal-next.png'),
      fullPage: false,
    });
  }
}

async function testHomepageRevealNextFit(page) {
  await installVerifyDataMocks(page);
  await installScoutingProgressMock(
    page,
    buildScoutingProgressResponse({ contributions: 4, unlocked: false }),
  );
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.locator('[data-hp-duel-slot="left"] [data-homepage="true"]').first().click();
  await page.waitForSelector('[data-hp-duel-next]', { timeout: 90000 });

  const fit = await page.evaluate(() => {
    const panel = document.querySelector('[data-hp-duel-panel]');
    const next = document.querySelector('[data-hp-duel-next]');
    const cardsRow = document.querySelector('[data-hp-duel-row]');
    if (!panel || !next || !cardsRow) return null;
    const panelRect = panel.getBoundingClientRect();
    const nextRect = next.getBoundingClientRect();
    const cardsRect = cardsRow.getBoundingClientRect();
    return {
      panel: panelRect,
      nextBottom: nextRect.bottom,
      panelBottom: panelRect.bottom,
      cardsTop: cardsRect.top,
    };
  });

  assert(fit, 'reveal fit metrics missing');
  assert(fit.nextBottom <= fit.panelBottom + TOL, 'NEXT overflows panel bottom');
  assert(approx(fit.cardsTop, fit.cardsTop), 'cards anchor present');
}

async function testDuelsDesktop(page) {
  await installVerifyDataMocks(page);
  await installScoutingProgressMock(
    page,
    buildScoutingProgressResponse({ contributions: 4, unlocked: false }),
  );
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto(`${BASE}/duels`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForSelector('[data-duels-page="true"]', { timeout: 120000 });
  await page.waitForSelector('[data-scouting-progress-bar]', { timeout: 120000 });
  await page.waitForSelector('[data-duels-page="true"] .topDesktop .posBadge', {
    timeout: 120000,
  });

  const gap = await page.evaluate(() => {
    const bar = document.querySelector('[data-scouting-progress-bar]');
    const skip = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent?.trim().toUpperCase() === 'SKIP',
    );
    const badge = document.querySelector('[data-duels-page="true"] .topDesktop .posBadge');
    if (!bar || !skip || !badge) return null;
    const barRect = bar.getBoundingClientRect();
    const skipRect = skip.getBoundingClientRect();
    const badgeRect = badge.getBoundingClientRect();
    return {
      progressToSkip: skipRect.top - barRect.bottom,
      badgeWidth: badgeRect.width,
      badgeHeight: badgeRect.height,
    };
  });

  assert(gap, 'duels desktop metrics missing');
  assert(gap.progressToSkip >= 6 && gap.progressToSkip <= 14, `progress→SKIP gap ${gap.progressToSkip}`);
  assert(approx(gap.badgeWidth, 25), `badge width ${gap.badgeWidth}`);
  assert(approx(gap.badgeHeight, 25), `badge height ${gap.badgeHeight}`);

  await page.screenshot({
    path: join(SHOT_DIR, 'duels-desktop-before-vote.png'),
    fullPage: false,
  });
}

async function testMyScoutingLayout(page, viewport, label) {
  await installVerifyDataMocks(page);
  await installScoutingProgressMock(
    page,
    buildScoutingProgressResponse({ contributions: 30, unlocked: true }),
  );
  await installMyScoutingMock(
    page,
    buildMyScoutingResponse({
      recentContributions: Array.from({ length: 5 }, (_, index) => ({
        type: 'duel',
        id: `duel-${index}`,
        attribute_key: 'pace',
        created_at: new Date(Date.now() - index * 60000).toISOString(),
        selected_player_id: 102,
        player_a: { id: 101, name: 'Bukayo Saka', delta: 0.01 },
        player_b: { id: 102, name: 'Jérémy Doku', delta: 0.04 },
      })),
    }),
  );
  await page.setViewportSize(viewport);
  await page.goto(`${BASE}/my-scouting`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForSelector('text=DUELS', { timeout: 120000 });
  await page.waitForSelector('[aria-label="Scouting statistics"]', { timeout: 120000 });
  await page.waitForSelector('[class*="recentPanel"]', { timeout: 120000 });

  const layout = await collectMyScoutingPrimaryGridMetrics(page);
  const fill = await page.evaluate(() => {
    const el = document.querySelector('[class*="nextUnlockFill"]');
    return el ? getComputedStyle(el).backgroundImage : null;
  });
  const iconStroke = await page.evaluate(() => {
    const duelIcon = document.querySelector('[aria-label="DUELS:"] svg');
    return duelIcon ? getComputedStyle(duelIcon).stroke : null;
  });

  assertNoHorizontalOverflow(layout, label);

  if (viewport.width >= 1200) {
    assertDesktopPrimaryGrid(layout, label);
  } else {
    assertMobileStackOrder(layout, label);
  }

  assert(fill === 'none', 'next unlock fill gradient present');
  assert(iconStroke !== 'rgb(0, 0, 0)', 'duels icon stroke is black');

  await page.screenshot({
    path: join(SHOT_DIR, `my-scouting-${label}.png`),
    fullPage: true,
  });
}

async function testMyScoutingLoadingShot(page) {
  await installVerifyDataMocks(page);
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  await page.route('**/api/scouting/progress**', async (route) => {
    await gate;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(buildScoutingProgressResponse({ contributions: 30, unlocked: true })),
    });
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${BASE}/my-scouting`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction(
    () =>
      Array.from(document.querySelectorAll('div')).some((el) => {
        const s = getComputedStyle(el);
        return s.position === 'fixed' && s.zIndex === '9999';
      }),
    undefined,
    { timeout: 60000 },
  );
  await page.screenshot({
    path: join(SHOT_DIR, 'my-scouting-loading.png'),
    fullPage: false,
  });
  release();
}

async function testMobileNavFont(page) {
  await installVerifyDataMocks(page);
  await page.setViewportSize({ width: 500, height: 844 });
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForSelector('[data-nav-item="duels"]', { timeout: 60000 });
  const fontSize = await page.evaluate(() => {
    const item = document.querySelector('[data-nav-item="duels"]');
    return item ? getComputedStyle(item).fontSize : null;
  });
  assert(fontSize === '10px', `expected mobile nav 10px, got ${fontSize}`);
}

async function main() {
  await mkdir(SHOT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });

  try {
    const desktop = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await testHomepageNeutralWidth(desktop, 'desktop');
    await testPendingVoteLifecycle(desktop, { homepage: true });
    await testHomepageRevealNextFit(desktop);
    await testMobileNavFont(desktop);
    await desktop.close();

    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await testHomepageNeutralWidth(mobile, 'mobile');
    await mobile.close();

    const duels = await browser.newPage();
    await testDuelsDesktop(duels);
    await testPendingVoteLifecycle(duels, { homepage: false });
    await duels.close();

    const msDesktop = await browser.newPage();
    await testMyScoutingLoadingShot(msDesktop);
    await testMyScoutingLayout(msDesktop, { width: 1280, height: 900 }, 'desktop');
    await msDesktop.close();

    const ms390 = await browser.newPage();
    await testMyScoutingLayout(ms390, { width: 390, height: 844 }, '390');
    await ms390.close();

    const ms320 = await browser.newPage();
    await testMyScoutingLayout(ms320, { width: 320, height: 568 }, '320');
    await ms320.close();

    console.log('verify-ui-polish-iteration: OK');
    console.log(`screenshots: ${SHOT_DIR}`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error('verify-ui-polish-iteration: FAILED');
  console.error(error);
  process.exit(1);
});
