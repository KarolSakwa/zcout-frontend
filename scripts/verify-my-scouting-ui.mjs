import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import {
  buildScoutingProgressResponse,
  installPlayerProfileMocks,
  installScoutingProgressMock,
  installVerifyDataMocks,
  waitForHomepageNeutralProgressAlignment,
} from './lib/verify-data-mocks.mjs';

const BASE = process.env.VERIFY_BASE_URL || 'http://localhost:3000';
const SHOT_DIR = join(process.cwd(), 'tmp', 'verify-my-scouting-ui');

const DESKTOP = { width: 1280, height: 800 };
const MOBILE = { width: 390, height: 844 };
const MOBILE_NARROW = { width: 320, height: 568 };

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function waitForNavReady(page, expectedState = null) {
  await page.waitForSelector('[data-nav-item="my-scouting"]', { timeout: 60000 });

  if (expectedState) {
    await page.waitForFunction(
      (state) =>
        document.querySelector('[data-nav-item="my-scouting"]')?.getAttribute('data-nav-state') ===
        state,
      expectedState,
      { timeout: 60000 },
    );
  } else {
    await page.waitForFunction(
      () => {
        const state = document
          .querySelector('[data-nav-item="my-scouting"]')
          ?.getAttribute('data-nav-state');
        return state === 'locked' || state === 'unlocked';
      },
      undefined,
      { timeout: 60000 },
    );
  }

  await page.waitForTimeout(200);
}

async function installLockedMocks(page) {
  await installVerifyDataMocks(page, {
    scoutingProgress: buildScoutingProgressResponse({ contributions: 12 }),
  });
}

async function installUnlockedMocks(page) {
  await installVerifyDataMocks(page, {
    scoutingProgress: buildScoutingProgressResponse({ contributions: 30, unlocked: true }),
  });
}

async function checkNavbarLocked(page) {
  await waitForNavReady(page, 'locked');
  const item = page.locator('[data-nav-item="my-scouting"]');
  await item.click({ force: true });
  assert(!(await page.url()).includes('/my-scouting'), 'locked nav should not navigate');
}

async function checkNavbarUnlocked(page) {
  await waitForNavReady(page, 'unlocked');
  const item = page.locator('[data-nav-item="my-scouting"]');
  const href = await item.getAttribute('href');
  assert(href === '/my-scouting', `expected /my-scouting href, got ${href}`);
}

async function checkDuelsProgressBar(page, compact = false) {
  await page.goto(`${BASE}/duels`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForSelector('[data-duels-row]', { timeout: 120000 });
  await waitForNavReady(page);

  const progress = page.locator('[aria-label^="Scouting progress:"]');
  await progress.waitFor({ state: 'visible', timeout: 30000 });

  const box = await progress.boundingBox();
  assert(box && box.width > 0, 'progress bar should have width');

  if (compact) {
    assert(box.width <= 240, `compact progress bar too wide: ${box.width}`);
  }

  const skip = page.locator('button', { hasText: 'SKIP' });
  await skip.waitFor({ state: 'visible' });
  const skipBox = await skip.boundingBox();
  assert(skipBox && box.y < skipBox.y, 'progress bar should sit above SKIP');

  const viewport = page.viewportSize();
  if (viewport) {
    assert(
      skipBox.y + skipBox.height <= viewport.height + 1,
      'SKIP should stay inside viewport',
    );
  }
}

async function checkHomepageCompactBar(page) {
  await installLockedMocks(page);
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForSelector('[data-hp-duel-panel]', { timeout: 120000 });
  await page.waitForSelector('[data-hp-duel-row]', { timeout: 120000 });
  await page.waitForSelector('[data-scouting-progress-variant="compact"]', { timeout: 30000 });
  await waitForHomepageNeutralProgressAlignment(page);
  await waitForNavReady(page);

  const layout = await page.evaluate(() => {
    const bar = document.querySelector('[data-scouting-progress-bar]');
    const leftCard = document.querySelector('[data-hp-duel-slot="left"] [data-homepage="true"]');
    const rightCard = document.querySelector('[data-hp-duel-slot="right"] [data-homepage="true"]');
    const skip = Array.from(document.querySelectorAll('button')).find(
      (node) => node.textContent?.trim().toUpperCase() === 'SKIP',
    );
    if (!bar || !leftCard || !rightCard || !skip) return null;
    const barRect = bar.getBoundingClientRect();
    const leftRect = leftCard.getBoundingClientRect();
    const rightRect = rightCard.getBoundingClientRect();
    const skipRect = skip.getBoundingClientRect();
    const fillStyle = getComputedStyle(
      document.querySelector('[data-scouting-progress-fill]'),
    );
    const neutralSpan = rightRect.right - leftRect.left;
    return {
      barWidth: barRect.width,
      neutralSpan,
      gapBarToSkip: skipRect.top - barRect.bottom,
      barAboveSkip: barRect.bottom < skipRect.top,
      fillBackgroundImage: fillStyle?.backgroundImage ?? null,
    };
  });

  assert(layout, 'homepage progress layout missing');
  assert(
    Math.abs(Math.round(layout.barWidth) - Math.round(layout.neutralSpan)) <= 1,
    `progress width should match neutral cards span (${layout.barWidth} vs ${layout.neutralSpan})`,
  );
  assert(layout.barAboveSkip, 'homepage progress bar should sit above SKIP');
  assert(layout.fillBackgroundImage === 'none', 'fill must use solid color');
}

async function checkAuthDropdownProgress(page) {
  await installPlayerProfileMocks(page);
  await installScoutingProgressMock(
    page,
    buildScoutingProgressResponse({ contributions: 18 }),
  );

  await page.goto(`${BASE}/about`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await waitForNavReady(page);
  await page.waitForSelector('[aria-label="Account"]', { timeout: 30000 });

  await page.locator('[aria-label="Account"]').evaluate((button) => {
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });

  await page.locator('text=Verify Scout').waitFor({ state: 'visible', timeout: 30000 });
  await page.getByRole('button', { name: 'Log out' }).waitFor({ state: 'visible' });
  await page.locator('[class*="progressSlot"]').locator('[aria-label^="Scouting progress:"]').waitFor({
    state: 'visible',
  });
  await page.locator('[class*="menuButtonLocked"]').waitFor({ state: 'visible' });
}

async function capture(page, name) {
  await mkdir(SHOT_DIR, { recursive: true });
  await page.screenshot({ path: join(SHOT_DIR, `${name}.png`), fullPage: true });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const results = [];

  try {
    {
      const page = await browser.newPage({ viewport: DESKTOP });
      await installLockedMocks(page);
      await page.goto(`${BASE}/duels`, { waitUntil: 'domcontentloaded', timeout: 180000 });
      await waitForNavReady(page);
      await checkNavbarLocked(page);
      await capture(page, 'desktop-navbar-locked');
      await page.close();
      results.push('desktop navbar locked');
    }

    {
      const page = await browser.newPage({ viewport: DESKTOP });
      await installUnlockedMocks(page);
      await page.goto(`${BASE}/duels`, { waitUntil: 'domcontentloaded', timeout: 180000 });
      await waitForNavReady(page);
      await checkNavbarUnlocked(page);
      await capture(page, 'desktop-navbar-unlocked');
      await page.close();
      results.push('desktop navbar unlocked');
    }

    {
      const page = await browser.newPage({ viewport: MOBILE });
      await installLockedMocks(page);
      await page.goto(`${BASE}/duels`, { waitUntil: 'domcontentloaded', timeout: 180000 });
      await waitForNavReady(page);
      await checkNavbarLocked(page);
      await page.close();
      results.push('mobile navbar locked');
    }

    {
      const page = await browser.newPage({ viewport: MOBILE });
      await installUnlockedMocks(page);
      await page.goto(`${BASE}/duels`, { waitUntil: 'domcontentloaded', timeout: 180000 });
      await waitForNavReady(page);
      await checkNavbarUnlocked(page);
      await page.close();
      results.push('mobile navbar unlocked');
    }

    {
      const page = await browser.newPage({ viewport: DESKTOP });
      await installLockedMocks(page);
      await checkDuelsProgressBar(page, false);
      await capture(page, 'duels-progress-default');
      await page.close();
      results.push('duels default progress bar');
    }

    {
      const page = await browser.newPage({ viewport: MOBILE });
      await checkHomepageCompactBar(page);
      await capture(page, 'homepage-progress-compact');
      await page.close();
      results.push('homepage compact progress bar');
    }

    {
      const page = await browser.newPage({ viewport: MOBILE_NARROW });
      await installLockedMocks(page);
      await page.goto(`${BASE}/duels`, { waitUntil: 'domcontentloaded', timeout: 180000 });
      await page.waitForSelector('[data-duels-row]', { timeout: 120000 });
      await waitForNavReady(page);
      const skip = page.locator('button', { hasText: 'SKIP' });
      await skip.waitFor({ state: 'visible' });
      const skipBox = await skip.boundingBox();
      const viewport = page.viewportSize();
      assert(
        skipBox && viewport && skipBox.y + skipBox.height <= viewport.height + 1,
        'SKIP overflow at 320x568',
      );
      await page.close();
      results.push('320x568 skip in viewport');
    }

    {
      const page = await browser.newPage({ viewport: DESKTOP });
      await checkAuthDropdownProgress(page);
      await capture(page, 'auth-dropdown-progress');
      await page.close();
      results.push('auth dropdown progress');
    }

    console.log('verify-my-scouting-ui: OK');
    for (const line of results) console.log(`  - ${line}`);
    console.log(`screenshots: ${SHOT_DIR}`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error('verify-my-scouting-ui: FAILED');
  console.error(error);
  process.exit(1);
});
