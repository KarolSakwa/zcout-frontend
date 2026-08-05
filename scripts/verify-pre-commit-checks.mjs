import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import {
  buildScoutingProgressResponse,
  installScoutingProgressMock,
  installVerifyDataMocks,
  waitForHomepageNeutralProgressAlignment,
} from './lib/verify-data-mocks.mjs';

const BASE = process.env.VERIFY_BASE_URL || 'http://localhost:3000';
const SHOT_DIR = join(process.cwd(), 'tmp', 'verify-pre-commit-checks');
const TOL = 1;

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

  const counterBefore = await page.locator('[data-scouting-progress-bar]').innerText();
  const skip = page.locator('button', { hasText: /^skip$/i });

  await page
    .locator('[data-hp-duel-slot="left"] [data-homepage="true"]')
    .first()
    .click({ timeout: 30000 });

  await page.waitForTimeout(300);

  assert(await page.locator('[data-scouting-progress-bar]').isVisible(), 'progress hidden during pending vote');
  assert(await skip.isVisible(), 'SKIP hidden during pending vote');
  assert(await skip.isDisabled(), 'SKIP not disabled during pending vote');
  assert(
    !(await isDomVisible(page, '.revealPanelHomepage')),
    'reveal panel visible during pending vote',
  );
  assert(
    !(await isDomVisible(page, '.verdictLabel')),
    'crowd verdict label visible during pending vote',
  );
  const counterPending = await page.locator('[data-scouting-progress-bar]').innerText();
  assert(
    counterPending === counterBefore,
    `progress value changed during pending vote: ${counterPending} vs ${counterBefore}`,
  );

  await page.screenshot({
    path: join(SHOT_DIR, 'homepage-pending-vote.png'),
    fullPage: false,
  });

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

  assert(
    await isDomVisible(page, '.revealPanelHomepage'),
    'reveal panel not visible after vote response',
  );
  assert(
    !(await page.locator('[data-scouting-progress-bar]').isVisible()),
    'progress still visible when reveal panel is shown',
  );
  assert(!(await skip.isVisible()), 'SKIP still visible when reveal panel is shown');

  await page.waitForSelector('[data-hp-duel-next]', { timeout: 60000 });

  const nextFit = await page.evaluate(() => {
    const panel = document.querySelector('[data-hp-duel-panel]');
    const next = document.querySelector('[data-hp-duel-next]');
    if (!panel || !next) return null;
    const panelRect = panel.getBoundingClientRect();
    const nextRect = next.getBoundingClientRect();
    return {
      nextBottom: nextRect.bottom,
      panelBottom: panelRect.bottom,
    };
  });
  assert(nextFit, 'NEXT fit metrics missing');
  assert(
    nextFit.nextBottom <= nextFit.panelBottom + TOL,
    'NEXT overflows Current Duel panel when reveal is visible',
  );

  await page.screenshot({
    path: join(SHOT_DIR, 'homepage-reveal-visible.png'),
    fullPage: false,
  });

  await page.locator('[data-hp-duel-next]').click({ timeout: 30000 });
  await page.waitForSelector('[data-scouting-progress-bar]', { timeout: 60000 });
  await page.waitForFunction(
    () => {
      const skipBtn = Array.from(document.querySelectorAll('button')).find(
        (b) => b.textContent?.trim().toUpperCase() === 'SKIP',
      );
      const bar = document.querySelector('[data-scouting-progress-bar]');
      if (!skipBtn || !bar) return false;
      const barStyle = getComputedStyle(bar);
      const barRect = bar.getBoundingClientRect();
      const skipRect = skipBtn.getBoundingClientRect();
      const barVisible =
        barStyle.display !== 'none' &&
        barStyle.visibility !== 'hidden' &&
        barRect.width > 0 &&
        barRect.height > 0;
      const skipVisible = skipRect.width > 0 && skipRect.height > 0 && !skipBtn.disabled;
      return barVisible && skipVisible;
    },
    undefined,
    { timeout: 60000 },
  );

  console.log('homepage vote reveal DOM lifecycle: OK');
}

async function measureNavFont(page, width) {
  await page.setViewportSize({ width, height: 844 });
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForSelector('[data-nav-item="duels"]', { timeout: 60000 });
  return page.evaluate(() => {
    const item = document.querySelector('[data-nav-item="duels"]');
    return item ? getComputedStyle(item).fontSize : null;
  });
}

async function main() {
  await mkdir(SHOT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await testHomepageVoteRevealDomLifecycle(page);
    await page.close();

    const navPage = await browser.newPage();
    await installVerifyDataMocks(navPage);

    const font500 = await measureNavFont(navPage, 500);
    const font390 = await measureNavFont(navPage, 390);
    const font360 = await measureNavFont(navPage, 360);
    const font320 = await measureNavFont(navPage, 320);

    console.log(`nav font-size @500px: ${font500}`);
    console.log(`nav font-size @390px: ${font390}`);
    console.log(`nav font-size @360px: ${font360}`);
    console.log(`nav font-size @320px: ${font320}`);

    assert(font500 === '10px', `expected 10px at 500, got ${font500}`);
    assert(font390 === '9px', `expected 9px at 390, got ${font390}`);
    assert(font360 === '9px', `expected 9px at 360, got ${font360}`);
    assert(font320 === '9px', `expected 9px at 320, got ${font320}`);

    await navPage.setViewportSize({ width: 320, height: 568 });
    await navPage.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 180000 });
    await navPage.waitForSelector('[data-nav-item="duels"]', { timeout: 60000 });
    await navPage.screenshot({
      path: join(SHOT_DIR, 'navbar-320.png'),
      fullPage: false,
    });
    await navPage.close();

    console.log(`screenshots: ${SHOT_DIR}`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error('verify-pre-commit-checks: FAILED');
  console.error(error);
  process.exit(1);
});
