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

const BASE = process.env.VERIFY_BASE_URL || 'http://localhost:3000';
const SHOT_DIR = join(process.cwd(), 'tmp', 'verify-final-narrow-polish');
const TOL = 1;
const DUELS_PROGRESS_TRANSLATE_Y = 24;

function assert(condition, message) {
  if (!condition) throw new Error(message);
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
        scouting_progress: buildScoutingProgressResponse({
          contributions: 5,
          unlocked: false,
        }).scouting_progress,
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

async function isDomVisible(page, selector) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return false;
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
      return false;
    }
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }, selector);
}

async function readMeterStyles(page, trackSelector, fillSelector) {
  return page.evaluate(
    ({ trackSel, fillSel }) => {
      const track = document.querySelector(trackSel);
      const fill = document.querySelector(fillSel);
      if (!track || !fill) return null;
      const trackStyle = getComputedStyle(track);
      const fillStyle = getComputedStyle(fill);
      return {
        trackRadius: trackStyle.borderRadius,
        fillRadius: fillStyle.borderRadius,
        fillBackgroundImage: fillStyle.backgroundImage,
        fillBackgroundColor: fillStyle.backgroundColor,
      };
    },
    { trackSel: trackSelector, fillSel: fillSelector },
  );
}

async function testHomepageVoteRevealDomLifecycle(page) {
  await installVerifyDataMocks(page);
  await installScoutingProgressMock(
    page,
    buildScoutingProgressResponse({ contributions: 4, unlocked: false }),
  );
  const releaseVote = await installDelayedVote(page);

  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForSelector('[data-scouting-progress-bar]', { timeout: 120000 });
  await waitForHomepageNeutralProgressAlignment(page);

  const skip = page.locator('button', { hasText: /^skip$/i });
  assert(await page.locator('[data-scouting-progress-bar]').isVisible(), 'progress missing before vote');
  assert(await skip.isVisible(), 'SKIP missing before vote');
  assert(!(await skip.isDisabled()), 'SKIP disabled before vote');

  const counterBefore = await page.locator('[data-scouting-progress-bar]').innerText();

  await page
    .locator('[data-hp-duel-slot="left"] [data-homepage="true"]')
    .first()
    .click({ timeout: 30000 });
  await page.waitForTimeout(300);

  assert(await page.locator('[data-scouting-progress-bar]').isVisible(), 'progress hidden during pending vote');
  assert(await skip.isVisible(), 'SKIP hidden during pending vote');
  assert(await skip.isDisabled(), 'SKIP not disabled during pending vote');
  assert(!(await isDomVisible(page, '.revealPanelHomepage')), 'reveal visible during pending vote');
  const counterPending = await page.locator('[data-scouting-progress-bar]').innerText();
  assert(counterPending === counterBefore, 'progress value changed during pending vote');

  releaseVote();

  await page.waitForFunction(
    () => {
      const reveal = document.querySelector('.revealPanelHomepage');
      if (!reveal) return false;
      const style = getComputedStyle(reveal);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
      const rect = reveal.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    },
    undefined,
    { timeout: 60000 },
  );

  assert(await isDomVisible(page, '.revealPanelHomepage'), 'reveal not visible after vote');
  assert(!(await page.locator('[data-scouting-progress-bar]').isVisible()), 'progress visible during reveal');
  assert(!(await skip.isVisible()), 'SKIP visible during reveal');

  await page.locator('[data-hp-duel-next]').click({ timeout: 30000 });
  await page.waitForSelector('[data-scouting-progress-bar]', { timeout: 60000 });
  const counterAfter = await page.locator('[data-scouting-progress-bar]').innerText();
  assert(counterAfter !== counterBefore, 'progress not updated after next duel');
  assert(await skip.isVisible(), 'SKIP not visible after next duel');

  console.log('pending vote → reveal DOM lifecycle: OK');
}

async function testProgressBarGeometry(browser) {
  const homepagePage = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await installVerifyDataMocks(homepagePage);
  await installScoutingProgressMock(
    homepagePage,
    buildScoutingProgressResponse({ contributions: 4, unlocked: false }),
  );
  await homepagePage.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await homepagePage.waitForSelector('[data-scouting-progress-track]', { timeout: 120000 });

  const homepage = await readMeterStyles(
    homepagePage,
    '[data-scouting-progress-track]',
    '[data-scouting-progress-fill]',
  );
  assert(homepage, 'homepage meter missing');
  await homepagePage.close();

  const dashboardPage = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await installVerifyDataMocks(dashboardPage, {
    scoutingProgress: buildScoutingProgressResponse({ contributions: 30, unlocked: true }),
  });
  await installMyScoutingMock(dashboardPage, buildMyScoutingResponse());
  await dashboardPage.goto(`${BASE}/my-scouting`, { waitUntil: 'load', timeout: 180000 });
  await dashboardPage.waitForSelector('[class*="nextUnlockTrack"]', { timeout: 120000 });

  const dashboard = await readMeterStyles(
    dashboardPage,
    '[class*="nextUnlockTrack"]',
    '[class*="nextUnlockFill"]',
  );
  assert(dashboard, 'my-scouting next unlock meter missing');

  await dashboardPage.screenshot({
    path: join(SHOT_DIR, 'my-scouting-dashboard.png'),
    fullPage: false,
  });
  await dashboardPage.close();

  const lockedPage = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await installVerifyDataMocks(lockedPage, {
    scoutingProgress: buildScoutingProgressResponse({ contributions: 12, unlocked: false }),
  });
  await lockedPage.goto(`${BASE}/my-scouting`, { waitUntil: 'load', timeout: 180000 });
  await lockedPage.waitForSelector('[class*="lockedTrack"]', { timeout: 120000 });

  const locked = await readMeterStyles(
    lockedPage,
    '[class*="lockedTrack"]',
    '[class*="lockedFill"]',
  );
  assert(locked, 'my-scouting locked meter missing');
  await lockedPage.close();

  console.log('homepage track border-radius:', homepage.trackRadius);
  console.log('homepage fill border-radius:', homepage.fillRadius);
  console.log('my-scouting next unlock track border-radius:', dashboard.trackRadius);
  console.log('my-scouting next unlock fill border-radius:', dashboard.fillRadius);
  if (locked) {
    console.log('my-scouting locked track border-radius:', locked.trackRadius);
    console.log('my-scouting locked fill border-radius:', locked.fillRadius);
  }

  assert(homepage.fillBackgroundImage === 'none', 'homepage fill has gradient');
  assert(dashboard.fillBackgroundImage === 'none', 'next unlock fill has gradient');
  assert(dashboard.trackRadius === homepage.trackRadius, 'next unlock track radius mismatch');
  assert(dashboard.fillRadius === homepage.fillRadius, 'next unlock fill radius mismatch');
  assert(locked.fillBackgroundImage === 'none', 'locked fill has gradient');
  assert(locked.trackRadius === homepage.trackRadius, 'locked track radius mismatch');
  assert(locked.fillRadius === homepage.fillRadius, 'locked fill radius mismatch');

  console.log('progress bar geometry: OK');
}

async function measureDuelsPreVote(page) {
  return page.evaluate(() => {
    const bar = document.querySelector('[data-scouting-progress-bar]');
    const skip = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent?.trim().toUpperCase() === 'SKIP',
    );
    const leftCard = document.querySelector('[data-duels-slot="left"] [data-duels-page="true"]');
    const stage = document.querySelector('[data-duels-page="true"]')?.closest('main')
      ?? document.querySelector('[data-duels-row]')?.parentElement;
    if (!bar || !skip || !leftCard) return null;
    const barRect = bar.getBoundingClientRect();
    const skipRect = skip.getBoundingClientRect();
    const cardRect = leftCard.getBoundingClientRect();
    const stageRect = stage?.getBoundingClientRect() ?? null;
    return {
      progressY: barRect.top,
      progressBottom: barRect.bottom,
      skipY: skipRect.top,
      skipBottom: skipRect.bottom,
      gapProgressToSkip: skipRect.top - barRect.bottom,
      cardTop: cardRect.top,
      stageBox: stageRect
        ? { x: stageRect.x, y: stageRect.y, width: stageRect.width, height: stageRect.height }
        : null,
    };
  });
}

async function testDuelsProgressPosition(page) {
  await installVerifyDataMocks(page);
  await installScoutingProgressMock(
    page,
    buildScoutingProgressResponse({ contributions: 4, unlocked: false }),
  );
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto(`${BASE}/duels`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForSelector('[data-scouting-progress-bar]', { timeout: 120000 });
  await page.waitForSelector('[data-duels-page="true"]', { timeout: 120000 });

  const after = await measureDuelsPreVote(page);
  assert(after, 'duels pre-vote metrics missing');

  const progressYBefore = after.progressY + DUELS_PROGRESS_TRANSLATE_Y;

  console.log('duels progress y (after):', after.progressY);
  console.log('duels progress y (estimated before):', progressYBefore);
  console.log('duels SKIP y:', after.skipY);
  console.log('duels progress→SKIP gap:', after.gapProgressToSkip);
  console.log('duels card top:', after.cardTop);

  assert(
    after.progressY <= progressYBefore - DUELS_PROGRESS_TRANSLATE_Y + TOL,
    `progress y not raised: after ${after.progressY}, estimated before ${progressYBefore}`,
  );
  assert(after.gapProgressToSkip >= 28, `progress too close to SKIP: gap ${after.gapProgressToSkip}`);

  await page.screenshot({
    path: join(SHOT_DIR, 'duels-before-vote.png'),
    fullPage: false,
  });

  const releaseVote = await installDelayedVote(page);
  await page.locator('[data-duels-slot="left"] [data-duels-page="true"]').first().click();
  await page.waitForTimeout(300);
  assert(await page.locator('[data-scouting-progress-bar]').isVisible(), 'progress hidden during duels vote');
  releaseVote();
  await page.waitForFunction(
    () => !document.querySelector('[data-scouting-progress-bar]'),
    undefined,
    { timeout: 60000 },
  );

  console.log('duels progress position regression: OK');
}

async function main() {
  await mkdir(SHOT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });

  try {
    const lifecyclePage = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await testHomepageVoteRevealDomLifecycle(lifecyclePage);
    await lifecyclePage.close();

    await testProgressBarGeometry(browser);

    const duels = await browser.newPage();
    await testDuelsProgressPosition(duels);
    await duels.close();

    console.log(`screenshots: ${SHOT_DIR}`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error('verify-final-narrow-polish: FAILED');
  console.error(error);
  process.exit(1);
});
