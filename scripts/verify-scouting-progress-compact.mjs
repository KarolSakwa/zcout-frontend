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
const SHOT_DIR = join(process.cwd(), 'tmp', 'verify-scouting-progress-compact');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function approx(a, b, tol = 1) {
  return Math.abs(Math.round(a) - Math.round(b)) <= tol;
}

async function measureHomepageLayout(page) {
  return page.evaluate(() => {
    const root = document.querySelector('[data-scouting-progress-bar]');
    const track = document.querySelector('[data-scouting-progress-track]');
    const fill = document.querySelector('[data-scouting-progress-fill]');
    const leftCard = document.querySelector('[data-hp-duel-slot="left"] [data-homepage="true"]');
    const rightCard = document.querySelector('[data-hp-duel-slot="right"] [data-homepage="true"]');
    const skip = Array.from(document.querySelectorAll('button')).find(
      (node) => node.textContent?.trim().toUpperCase() === 'SKIP',
    );
    const overlay = document.querySelector('[class*="homepageProgressOverlay"]');

    if (!root || !track || !fill || !leftCard || !rightCard || !skip) {
      return null;
    }

    const rootRect = root.getBoundingClientRect();
    const trackRect = track.getBoundingClientRect();
    const fillRect = fill.getBoundingClientRect();
    const leftRect = leftCard.getBoundingClientRect();
    const rightRect = rightCard.getBoundingClientRect();
    const skipRect = skip.getBoundingClientRect();
    const overlayRect = overlay?.getBoundingClientRect();
    const fillStyle = getComputedStyle(fill);
    const skipArea = skip.parentElement;
    const neutralSpan = rightRect.right - leftRect.left;

    return {
      rootWidth: rootRect.width,
      progressWidth: rootRect.width,
      neutralSpan,
      trackWidth: trackRect.width,
      fillWidth: fillRect.width,
      overlayWidth: overlayRect?.width ?? null,
      gapBarToSkip: skipRect.top - rootRect.bottom,
      barAboveSkip: rootRect.bottom < skipRect.top,
      skipAreaHeight: skipArea?.getBoundingClientRect().height ?? null,
      fillBackgroundImage: fillStyle.backgroundImage,
      fillBackgroundColor: fillStyle.backgroundColor,
      barWithinViewport:
        rootRect.left >= -1 && rootRect.right <= window.innerWidth + 1,
      skipHorizontallyWithinViewport:
        skipRect.left >= -1 && skipRect.right <= window.innerWidth + 1,
    };
  });
}

async function runViewport(browser, viewport, label) {
  const page = await browser.newPage({ viewport });

  await installVerifyDataMocks(page);
  await installScoutingProgressMock(
    page,
    buildScoutingProgressResponse({ contributions: 2, unlocked: false }),
  );

  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForSelector('[data-hp-duel-panel]', { timeout: 120000 });
  await page.waitForSelector('[data-scouting-progress-variant="compact"]', {
    timeout: 60000,
  });
  await waitForHomepageNeutralProgressAlignment(page);

  const layout = await measureHomepageLayout(page);
  assert(layout, 'homepage progress layout elements missing');

  console.log(`[${label}] homepage progress layout:`);
  console.log(JSON.stringify(layout, null, 2));

  assert(layout.trackWidth > 60, `track width too small: ${layout.trackWidth}`);
  assert(layout.fillWidth > 0, `fill width is zero: ${layout.fillWidth}`);
  assert(layout.fillWidth < layout.trackWidth, 'fill should be narrower than track');
  assert(layout.fillBackgroundImage === 'none', `fill must be solid: ${layout.fillBackgroundImage}`);
  assert(
    layout.fillBackgroundColor && layout.fillBackgroundColor !== 'rgba(0, 0, 0, 0)',
    `fill must have solid background-color: ${layout.fillBackgroundColor}`,
  );
    assert(
      layout.overlayWidth != null &&
        approx(layout.progressWidth, layout.neutralSpan),
      `progress width should match neutral cards span (${layout.progressWidth} vs ${layout.neutralSpan})`,
    );
  assert(layout.barAboveSkip, 'progress bar must stay above SKIP');
  assert(layout.barWithinViewport, 'progress bar overflows viewport horizontally');
  assert(layout.skipHorizontallyWithinViewport, 'SKIP overflows viewport horizontally');

  await mkdir(SHOT_DIR, { recursive: true });
  await page.screenshot({
    path: join(SHOT_DIR, `homepage-compact-progress-bar-${label}.png`),
    fullPage: false,
  });

  await page.close();
}

async function main() {
  const browser = await chromium.launch({ headless: true });

  try {
    await runViewport(browser, { width: 1280, height: 900 }, 'desktop');
    await runViewport(browser, { width: 390, height: 844 }, 'mobile');
    console.log('verify-scouting-progress-compact: OK');
    console.log(`screenshots: ${SHOT_DIR}`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error('verify-scouting-progress-compact: FAILED');
  console.error(error);
  process.exit(1);
});
