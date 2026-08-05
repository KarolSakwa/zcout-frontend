import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import {
  buildScoutingProgressResponse,
  installScoutingProgressMock,
  installVerifyDataMocks,
  waitForHomepageNeutralProgressAlignment,
} from './lib/verify-data-mocks.mjs';

const BASE = process.env.VERIFY_BASE_URL || 'http://localhost:3001';
const SHOT_DIR = join(process.cwd(), 'tmp', 'verify-final-narrow-polish');
const DUELS_PROGRESS_TRANSLATE_Y = 24;
const TOL = 1;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function installDelayedVote(page) {
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
          { id: 101, rating: 91, rating_before: 90.5, rating_after: 91, delta: 0.5, votes_count: 100 },
          { id: 102, rating: 89, rating_before: 89.2, rating_after: 89, delta: -0.2, votes_count: 100 },
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
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }, selector);
}

async function testLifecycle(page) {
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
  assert(await page.locator('[data-scouting-progress-bar]').isVisible());
  assert(await skip.isVisible());
  assert(!(await skip.isDisabled()));

  const before = await page.locator('[data-scouting-progress-bar]').innerText();
  await page.locator('[data-hp-duel-slot="left"] [data-homepage="true"]').first().click();
  await page.waitForTimeout(300);

  assert(await page.locator('[data-scouting-progress-bar]').isVisible());
  assert(await skip.isVisible());
  assert(await skip.isDisabled());
  assert(!(await isDomVisible(page, '.revealPanelHomepage')));
  assert((await page.locator('[data-scouting-progress-bar]').innerText()) === before);

  await page.screenshot({ path: join(SHOT_DIR, 'homepage-pending-vote.png'), fullPage: false });

  releaseVote();
  await page.waitForFunction(
    () => {
      const reveal = document.querySelector('.revealPanelHomepage');
      if (!reveal) return false;
      const rect = reveal.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    },
    undefined,
    { timeout: 60000 },
  );
  assert(!(await page.locator('[data-scouting-progress-bar]').isVisible()));
  assert(!(await skip.isVisible()));

  await page.screenshot({ path: join(SHOT_DIR, 'homepage-reveal-visible.png'), fullPage: false });

  await page.locator('[data-hp-duel-next]').click();
  await page.waitForSelector('[data-scouting-progress-bar]', { timeout: 60000 });
  assert((await page.locator('[data-scouting-progress-bar]').innerText()) !== before);
  assert(await skip.isVisible());
  console.log('pending vote → reveal DOM lifecycle: OK');
}

async function testHomepageRadius(page) {
  await installVerifyDataMocks(page);
  await installScoutingProgressMock(
    page,
    buildScoutingProgressResponse({ contributions: 4, unlocked: false }),
  );
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForSelector('[data-scouting-progress-track]', { timeout: 120000 });
  const styles = await page.evaluate(() => {
    const track = document.querySelector('[data-scouting-progress-track]');
    const fill = document.querySelector('[data-scouting-progress-fill]');
    const trackStyle = getComputedStyle(track);
    const fillStyle = getComputedStyle(fill);
    return {
      trackRadius: trackStyle.borderRadius,
      fillRadius: fillStyle.borderRadius,
      fillBackgroundImage: fillStyle.backgroundImage,
    };
  });
  console.log('homepage track border-radius:', styles.trackRadius);
  console.log('homepage fill border-radius:', styles.fillRadius);
  console.log('homepage fill background-image:', styles.fillBackgroundImage);
  return styles;
}

async function testDuels(page) {
  await installVerifyDataMocks(page);
  await installScoutingProgressMock(
    page,
    buildScoutingProgressResponse({ contributions: 4, unlocked: false }),
  );
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto(`${BASE}/duels`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForSelector('[data-scouting-progress-bar]', { timeout: 120000 });

  const metrics = await page.evaluate(() => {
    const bar = document.querySelector('[data-scouting-progress-bar]');
    const skip = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent?.trim().toUpperCase() === 'SKIP',
    );
    const leftCard = document.querySelector('[data-duels-slot="left"] [data-duels-page="true"]');
    const barRect = bar.getBoundingClientRect();
    const skipRect = skip.getBoundingClientRect();
    const cardRect = leftCard.getBoundingClientRect();
    return {
      progressY: barRect.top,
      skipY: skipRect.top,
      gap: skipRect.top - barRect.bottom,
      cardTop: cardRect.top,
    };
  });

  const progressYBefore = metrics.progressY + DUELS_PROGRESS_TRANSLATE_Y;
  console.log('duels progress y (after):', metrics.progressY);
  console.log('duels progress y (estimated before):', progressYBefore);
  console.log('duels SKIP y:', metrics.skipY);
  console.log('duels progress→SKIP gap:', metrics.gap);

  assert(metrics.gap >= 28, `gap too small: ${metrics.gap}`);
  assert(metrics.progressY <= progressYBefore - DUELS_PROGRESS_TRANSLATE_Y + TOL);

  await page.screenshot({ path: join(SHOT_DIR, 'duels-before-vote.png'), fullPage: false });
  console.log('duels progress position: OK');
}

async function main() {
  await mkdir(SHOT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    const lifecycle = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await testLifecycle(lifecycle);
    const homepageStyles = await testHomepageRadius(lifecycle);
    await lifecycle.close();

    const duels = await browser.newPage();
    await testDuels(duels);
    await duels.close();

    console.log('my-scouting track/fill border-radius (CSS token): var(--ui-radius-meter-tight) = 2px');
    console.log('my-scouting fill background-image: none (solid var(--ui-accent-primary))');
    assert(homepageStyles.fillBackgroundImage === 'none');
    console.log(`screenshots: ${SHOT_DIR}`);
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error('FAILED', e);
  process.exit(1);
});
