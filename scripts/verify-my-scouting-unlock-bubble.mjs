import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  VERIFY_MOCK_VOTE_RESPONSE,
  buildScoutingProgressResponse,
  installVerifyDataMocks,
} from './lib/verify-data-mocks.mjs';

const BASE = process.env.VERIFY_BASE_URL || 'http://localhost:3000';
const SHOT_DIR = join(process.cwd(), 'tmp', 'verify-my-scouting-unlock-bubble');
const REPORT_PATH = join(SHOT_DIR, 'report.json');
const MY_SCOUTING_UNLOCK = 2;
const YOUR_IMPACT_UNLOCK = 102;

const BUBBLE_VIEWPORTS = [
  { name: 'mobile-390', width: 390, height: 844 },
  { name: 'mobile-375', width: 375, height: 812 },
  { name: 'mobile-360', width: 360, height: 800 },
  { name: 'mobile-320', width: 320, height: 568 },
  { name: 'desktop-1440', width: 1440, height: 900 },
];

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

  await installVerifyDataMocks(page, { skipScoutingProgressMock: true });

  await page.route('**/api/scouting/progress**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ scouting_progress: buildDebugProgress(contributions) }),
    });
  });

  await page.route('**/api/vote**', async (route) => {
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
}

async function waitForProgressCounter(page, expected, timeout = 120000) {
  await page.waitForFunction(
    (value) => {
      const bar = document.querySelector('[data-scouting-progress-bar]');
      if (!bar) return false;
      const counter = bar.querySelector('span[aria-hidden="true"]');
      return counter?.textContent?.trim() === value;
    },
    expected,
    { timeout },
  );
}

async function clickFirstDuelWinner(page) {
  const card = page
    .locator('[data-hp-duel-slot="left"] [data-homepage="true"]')
    .first();
  await card.waitFor({ timeout: 120000 });
  await card.click();
}

async function measureUnlockBubble(page) {
  return page.evaluate(() => {
    const bubbleRoot = document.querySelector('[data-my-scouting-unlock-bubble]');
    const chrome = bubbleRoot?.querySelector('[role="status"]') ?? bubbleRoot;
    const anchor = document.querySelector('[data-nav-item="my-scouting"]');
    if (!bubbleRoot || !chrome || !anchor) {
      return { missing: true };
    }

    const bubbleBox = chrome.getBoundingClientRect();
    const anchorBox = anchor.getBoundingClientRect();
    const style = getComputedStyle(chrome);
    const doc = document.documentElement;

    const overlapsSearch = (() => {
      const search = document.querySelector('[data-nav-search]');
      if (!search) return false;
      const s = search.getBoundingClientRect();
      return (
        bubbleBox.left < s.right &&
        s.left < bubbleBox.right &&
        bubbleBox.top < s.bottom &&
        s.top < bubbleBox.bottom
      );
    })();

    const overlapsAnchorX =
      bubbleBox.left <= anchorBox.right + 4 && bubbleBox.right >= anchorBox.left - 4;

    const centerDeltaX = Math.abs(
      bubbleBox.left + bubbleBox.width / 2 - (anchorBox.left + anchorBox.width / 2),
    );

    return {
      missing: false,
      bubble: {
        left: bubbleBox.left,
        right: bubbleBox.right,
        top: bubbleBox.top,
        bottom: bubbleBox.bottom,
        width: bubbleBox.width,
        height: bubbleBox.height,
      },
      anchor: {
        left: anchorBox.left,
        right: anchorBox.right,
        top: anchorBox.top,
        bottom: anchorBox.bottom,
        width: anchorBox.width,
      },
      viewport: { width: window.innerWidth, height: window.innerHeight },
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      horizontalOverflow: doc.scrollWidth > doc.clientWidth + 1,
      withinViewport:
        bubbleBox.left >= -1 &&
        bubbleBox.right <= window.innerWidth + 1 &&
        bubbleBox.top >= -1 &&
        bubbleBox.bottom <= window.innerHeight + 1,
      belowAnchor: bubbleBox.top >= anchorBox.bottom - 2,
      overlapsAnchorX,
      centerDeltaX,
      overlapsSearch,
      visual: {
        backgroundColor: style.backgroundColor,
        color: style.color,
        borderRadius: style.borderRadius,
        boxShadow: style.boxShadow,
        paddingTop: style.paddingTop,
        paddingRight: style.paddingRight,
        paddingBottom: style.paddingBottom,
        paddingLeft: style.paddingLeft,
        fontWeight: style.fontWeight,
        fontSize: style.fontSize,
      },
    };
  });
}

async function measureDuelHint(page) {
  return page.evaluate(() => {
    const hints = [...document.querySelectorAll('[role="status"]')];
    const hint = hints.find((el) =>
      (el.textContent || '').includes('Pick your winner and reveal the crowd verdict'),
    );
    if (!hint) return { missing: true };
    const style = getComputedStyle(hint);
    const box = hint.getBoundingClientRect();
    return {
      missing: false,
      box: {
        left: box.left,
        right: box.right,
        top: box.top,
        width: box.width,
        height: box.height,
      },
      visual: {
        backgroundColor: style.backgroundColor,
        color: style.color,
        borderRadius: style.borderRadius,
        boxShadow: style.boxShadow,
        paddingTop: style.paddingTop,
        paddingBottom: style.paddingBottom,
        paddingLeft: style.paddingLeft,
        fontWeight: style.fontWeight,
      },
    };
  });
}

async function capture(page, name) {
  await mkdir(SHOT_DIR, { recursive: true });
  const path = join(SHOT_DIR, `${name}.png`);
  await page.screenshot({ path, fullPage: false });
  return path;
}

async function unlockAndShowBubble(page) {
  await installStatefulDebugProgress(page, 1);
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await waitForProgressCounter(page, '1/2');

  const navWidthBefore = await page.evaluate(() => {
    const wrap = document.querySelector('[data-nav-item="my-scouting"]')?.parentElement;
    return wrap ? wrap.getBoundingClientRect().width : null;
  });

  await clickFirstDuelWinner(page);
  await page.waitForTimeout(2500);
  await waitForProgressCounter(page, '0/100', 180000);

  const unlocked = page.locator('[data-nav-item="my-scouting"][data-nav-state="unlocked"]');
  await unlocked.waitFor({ timeout: 120000 });

  const bubble = page.locator('[data-my-scouting-unlock-bubble]');
  await bubble.waitFor({ timeout: 120000 });
  await page.locator('text=My Scouting unlocked').waitFor({ timeout: 5000 });

  return navWidthBefore;
}

async function main() {
  await mkdir(SHOT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const report = { viewports: {}, duelReference: null, screenshots: [] };

  try {
    for (const viewport of BUBBLE_VIEWPORTS) {
      const page = await browser.newPage({
        viewport: { width: viewport.width, height: viewport.height },
      });

      const navWidthBefore = await unlockAndShowBubble(page);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(100);
      const geometry = await measureUnlockBubble(page);
      assert(!geometry.missing, `${viewport.name}: unlock bubble missing`);
      assert(geometry.withinViewport, `${viewport.name}: bubble outside viewport`);
      assert(!geometry.horizontalOverflow, `${viewport.name}: horizontal overflow`);
      assert(geometry.belowAnchor, `${viewport.name}: bubble not below MY SCOUTING`);
      assert(geometry.overlapsAnchorX, `${viewport.name}: bubble not aligned to MY SCOUTING`);
      if (viewport.width >= 1000) {
        assert(!geometry.overlapsSearch, `${viewport.name}: bubble overlaps search`);
      }

      const widthsWhileOpen = await page.evaluate(() => {
        const anchor = document.querySelector('[data-nav-item="my-scouting"]');
        const wrap = anchor?.parentElement;
        return {
          wrap: wrap ? wrap.getBoundingClientRect().width : null,
          anchor: anchor ? anchor.getBoundingClientRect().width : null,
        };
      });
      assert(
        widthsWhileOpen.wrap != null &&
          widthsWhileOpen.anchor != null &&
          Math.abs(widthsWhileOpen.wrap - widthsWhileOpen.anchor) < 1.5,
        `${viewport.name}: bubble expands MY SCOUTING wrap (${widthsWhileOpen.wrap} vs anchor ${widthsWhileOpen.anchor})`,
      );

      const shotName = `unlock-bubble-${viewport.name}`;
      const shotPath = await capture(page, shotName);
      report.screenshots.push(shotPath);
      report.viewports[viewport.name] = {
        geometry,
        navWidthBefore,
        widthsWhileOpen,
        shotPath,
      };

      console.log(
        `${viewport.name}: OK (deltaX=${geometry.centerDeltaX.toFixed(1)}, bg=${geometry.visual.backgroundColor})`,
      );
      await page.close();
    }

    {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      await installVerifyDataMocks(page, {
        scoutingProgress: {
          scouting_progress: buildDebugProgress(0),
        },
      });
      await page.addInitScript(() => {
        try {
          sessionStorage.removeItem('zcout_duel_vote_hint_seen_v1');
        } catch {
          // ignore
        }
      });
      await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 180000 });
      await waitForProgressCounter(page, '0/2');
      await page.waitForFunction(
        () =>
          [...document.querySelectorAll('[role="status"]')].some((el) =>
            (el.textContent || '').includes('Pick your winner and reveal the crowd verdict'),
          ),
        { timeout: 20000 },
      );
      const duel = await measureDuelHint(page);
      assert(!duel.missing, 'homepage duel hint missing');
      const shotPath = await capture(page, 'homepage-duel-bubble-reference-1440');
      report.duelReference = { ...duel, shotPath };
      report.screenshots.push(shotPath);
      console.log(`duel reference: OK (bg=${duel.visual.backgroundColor})`);
      await page.close();
    }

    const unlockDesktop = report.viewports['desktop-1440']?.geometry?.visual;
    if (unlockDesktop && report.duelReference?.visual) {
      assert(
        unlockDesktop.backgroundColor === report.duelReference.visual.backgroundColor,
        `background mismatch unlock=${unlockDesktop.backgroundColor} duel=${report.duelReference.visual.backgroundColor}`,
      );
      assert(
        unlockDesktop.borderRadius === report.duelReference.visual.borderRadius,
        `radius mismatch unlock=${unlockDesktop.borderRadius} duel=${report.duelReference.visual.borderRadius}`,
      );
    }

    await writeFile(REPORT_PATH, JSON.stringify(report, null, 2));
    console.log('verify-my-scouting-unlock-bubble: OK');
    console.log(`screenshots: ${SHOT_DIR}`);
    console.log(`report: ${REPORT_PATH}`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
