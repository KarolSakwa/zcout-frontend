import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import {
  VERIFY_MOCK_PAIR,
  buildScoutingProgressResponse,
  installScoutingProgressMock,
  installVerifyDataMocks,
} from './lib/verify-data-mocks.mjs';

const BASE = process.env.VERIFY_BASE_URL || 'http://localhost:3000';
const SHOT_DIR = join(process.cwd(), 'tmp', 'verify-homepage-duel-panel-bounds');
const TOLERANCE_PX = 1;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function rectKey(rect) {
  return `${rect.width.toFixed(2)}|${rect.height.toFixed(2)}|${rect.x.toFixed(2)}|${rect.y.toFixed(2)}`;
}

function assertRectEqual(label, a, b, tolerance = TOLERANCE_PX) {
  for (const key of ['width', 'height', 'x', 'y']) {
    const diff = Math.abs(a[key] - b[key]);
    assert(
      diff <= tolerance,
      `${label}: ${key} differs (${a[key]} vs ${b[key]}, diff ${diff})`,
    );
  }
}

async function measureState(page) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(200);

  return page.evaluate(() => {
    const panel = document.querySelector('[data-hp-duel-panel]');
    const cardsRow = document.querySelector('[data-hp-duel-row]');
    const skip = Array.from(document.querySelectorAll('button')).find(
      (node) => node.textContent?.trim().toUpperCase() === 'SKIP',
    );
    const fill = document.querySelector('[data-scouting-progress-fill]');
    const skipArea = document.querySelector('[data-hp-reveal]')?.parentElement
      ?? document.querySelector('[class*="duelSkipAreaHomepage"]');

    const box = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        x: r.x + window.scrollX,
        y: r.y + window.scrollY,
        width: r.width,
        height: r.height,
      };
    };

    const fillStyle = fill ? getComputedStyle(fill) : null;

    return {
      panel: box(panel),
      cardsRow: box(cardsRow),
      skip: box(skip),
      skipAreaHeight: skipArea ? skipArea.getBoundingClientRect().height : null,
      hasProgressBar: Boolean(document.querySelector('[data-scouting-progress-bar]')),
      fillBackgroundImage: fillStyle?.backgroundImage ?? null,
      fillBackgroundColor: fillStyle?.backgroundColor ?? null,
      fillOpacity: fillStyle?.opacity ?? null,
      overflowX: (() => {
        const panel = document.querySelector('[data-hp-duel-panel]');
        if (!panel) {
          return document.documentElement.scrollWidth > window.innerWidth + 1;
        }
        return panel.scrollWidth > panel.clientWidth + 1;
      })(),
    };
  });
}

async function waitForHomepageDuel(page) {
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForSelector('[data-hp-duel-panel]', { timeout: 120000 });
  await page.waitForSelector('[data-hp-duel-row]', { timeout: 120000 });
  await page.waitForFunction(
    () => document.querySelectorAll('[data-homepage="true"]').length >= 2,
    undefined,
    { timeout: 60000 },
  );
  await page.waitForTimeout(600);
}

async function runViewport(browser, viewport, label) {
  const page = await browser.newPage({ viewport });

  let nextPairId = 1;
  await installVerifyDataMocks(page, { delayDuelsMs: 1200 });
  await installScoutingProgressMock(
    page,
    buildScoutingProgressResponse({ contributions: 2, unlocked: false }),
  );

  await page.route('**/api/duels/next**', async (route) => {
    await new Promise((r) => setTimeout(r, 1200));
    nextPairId += 1;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ...VERIFY_MOCK_PAIR,
        pair_id: nextPairId,
        left: { ...VERIFY_MOCK_PAIR.left, id: 100 + nextPairId },
        right: { ...VERIFY_MOCK_PAIR.right, id: 200 + nextPairId },
      }),
    });
  });

  await waitForHomepageDuel(page);

  const beforeVote = await measureState(page);
  assert(beforeVote.panel, 'panel missing before vote');
  assert(beforeVote.hasProgressBar, 'progress bar should be visible before vote');
  assert(beforeVote.fillBackgroundImage === 'none', `fill gradient present: ${beforeVote.fillBackgroundImage}`);
  assert(
    beforeVote.fillBackgroundColor && beforeVote.fillBackgroundColor !== 'rgba(0, 0, 0, 0)',
    `fill background not solid: ${beforeVote.fillBackgroundColor}`,
  );
  assert(!beforeVote.overflowX, 'horizontal overflow before vote');

  await mkdir(SHOT_DIR, { recursive: true });
  await page.screenshot({
    path: join(SHOT_DIR, `homepage-before-vote-${label}.png`),
    fullPage: false,
  });

  const leftCard = page.locator('[data-hp-duel-slot="left"] [data-homepage="true"]').first();
  await leftCard.click({ timeout: 30000 });

  await page.waitForFunction(
    () => {
      const revealAttr = document.querySelector('[data-hp-reveal="true"]');
      const next = document.querySelector('[data-hp-duel-next]');
      return Boolean(revealAttr && next);
    },
    undefined,
    { timeout: 90000 },
  );
  await page.waitForTimeout(600);

  const duringReveal = await measureState(page);
  assert(duringReveal.panel, 'panel missing during reveal');
  assert(!duringReveal.hasProgressBar, 'progress bar should hide during reveal');
  assertRectEqual('panel before vs reveal', beforeVote.panel, duringReveal.panel);
  if (beforeVote.cardsRow && duringReveal.cardsRow) {
    assertRectEqual('cards before vs reveal', beforeVote.cardsRow, duringReveal.cardsRow);
  }

  await page.screenshot({
    path: join(SHOT_DIR, `homepage-during-reveal-${label}.png`),
    fullPage: false,
  });

  await page.locator('[data-hp-duel-next]').click({ timeout: 30000 });

  await page
    .waitForResponse(
      (res) =>
        res.request().method() === 'GET' &&
        new URL(res.url()).pathname.includes('/api/duels/next'),
      { timeout: 30000 },
    )
    .catch(() => {});

  await page.waitForTimeout(500);

  const duringLoading = await measureState(page);
  assert(duringLoading.panel, 'panel missing during loading');
  assertRectEqual('panel before vs loading', beforeVote.panel, duringLoading.panel);

  await page.waitForSelector('button:has-text("SKIP")', { timeout: 120000 });
  await page.waitForTimeout(600);

  const afterNextDuel = await measureState(page);
  assert(afterNextDuel.panel, 'panel missing after next duel');
  assert(afterNextDuel.hasProgressBar, 'progress bar should return after next duel');
  assertRectEqual('panel before vs after next duel', beforeVote.panel, afterNextDuel.panel);
  assertRectEqual('skip before vs after next duel', beforeVote.skip, afterNextDuel.skip);

  console.log(`[${label}] panel rect stable: ${rectKey(beforeVote.panel)}`);
  console.log(`[${label}] fill background-color: ${beforeVote.fillBackgroundColor}`);

  await page.close();
}

async function main() {
  const browser = await chromium.launch({ headless: true });

  try {
    await runViewport(browser, { width: 1280, height: 900 }, 'desktop');
    await runViewport(browser, { width: 390, height: 844 }, 'mobile');
    console.log('verify-homepage-duel-panel-bounds: OK');
    console.log(`screenshots: ${SHOT_DIR}`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error('verify-homepage-duel-panel-bounds: FAILED');
  console.error(error);
  process.exit(1);
});
