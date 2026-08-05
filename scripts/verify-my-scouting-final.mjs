import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  VERIFY_MOCK_VOTE_RESPONSE,
  buildScoutingProgressResponse,
  installCsrfSupport,
  installVerifyDataMocks,
} from './lib/verify-data-mocks.mjs';

const BASE = process.env.VERIFY_BASE_URL || 'http://localhost:3000';
const API_BASE = process.env.VERIFY_API_BASE || 'http://localhost:8080';
const SHOT_DIR = join(process.cwd(), 'tmp', 'verify-my-scouting-final');
const REPORT_PATH = join(SHOT_DIR, 'report.json');
const MY_SCOUTING_UNLOCK = 2;
const YOUR_IMPACT_UNLOCK = 102;

const VIEWPORTS = [
  { name: 'desktop-1440', width: 1440, height: 900 },
  { name: 'desktop-1280', width: 1280, height: 720 },
  { name: 'mobile-390', width: 390, height: 844 },
  { name: 'mobile-320', width: 320, height: 568 },
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

  return {
    getContributions: () => contributions,
    setContributions: (value) => {
      contributions = value;
    },
  };
}

async function installRealBffProgress(page, initialContributions = 0) {
  let contributions = initialContributions;

  await installVerifyDataMocks(page, {
    skipScoutingProgressMock: true,
    skipVoteMock: true,
  });

  await page.route('**/api/vote**', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fallback();
      return;
    }

    const response = await route.fetch();
    const text = await response.text();
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      await route.fulfill({ response });
      return;
    }

    if (response.ok() && body?.scouting_progress?.contributions != null) {
      contributions = body.scouting_progress.contributions;
    }

    await route.fulfill({ response });
  });

  return {
    getContributions: () => contributions,
  };
}

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

async function readNavTypography(page) {
  return page.evaluate(() => {
    const pick = (selector) => {
      const el = document.querySelector(selector);
      if (!el) return null;
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return {
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        lineHeight: style.lineHeight,
        letterSpacing: style.letterSpacing,
        textTransform: style.textTransform,
        paddingTop: style.paddingTop,
        paddingBottom: style.paddingBottom,
        paddingLeft: style.paddingLeft,
        paddingRight: style.paddingRight,
        height: rect.height,
      };
    };

    return {
      duels: pick('[data-nav-item="duels"]'),
      myScoutingLocked: pick('[data-nav-item="my-scouting"][data-nav-state="locked"]'),
      myScoutingUnlocked: pick('[data-nav-item="my-scouting"][data-nav-state="unlocked"]'),
    };
  });
}

function assertTypographyMatch(reference, candidate, label) {
  if (!candidate) return;
  const keys = [
    'fontFamily',
    'fontSize',
    'fontWeight',
    'lineHeight',
    'letterSpacing',
    'textTransform',
    'paddingTop',
    'paddingBottom',
    'paddingLeft',
    'paddingRight',
  ];
  for (const key of keys) {
    assert(
      reference[key] === candidate[key],
      `${label} ${key}: expected ${reference[key]}, got ${candidate[key]}`,
    );
  }
  assert(
    Math.abs(reference.height - candidate.height) <= 1,
    `${label} height diff > 1px: ${reference.height} vs ${candidate.height}`,
  );
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

async function fetchBackendConfig() {
  try {
    const res = await fetch(`${API_BASE}/api/scouting/progress`, {
      headers: { Accept: 'application/json' },
    });
    const text = await res.text();
    return { status: res.status, body: text };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

async function main() {
  const report = {
    baseUrl: BASE,
    apiBase: API_BASE,
    backendProbe: await fetchBackendConfig(),
    timings: {},
    typography: {},
    bubble: {},
    authTexts: {},
  };

  const browser = await chromium.launch({ headless: true });

  try {
    {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      const progressEvents = [];
      page.on('response', async (response) => {
        const url = response.url();
        if (!url.includes('/api/scouting/progress')) return;
        const started = Date.now();
        const body = await response.text().catch(() => '');
        progressEvents.push({
          url,
          status: response.status(),
          body,
          finishedAt: Date.now(),
          durationMs: Date.now() - started,
        });
      });

      const state = await installStatefulDebugProgress(page, 1);
      await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 180000 });

      const navStart = Date.now();
      await waitForProgressCounter(page, '1/2');
      report.timings.reloadExistingAnon = {
        navigationToBarMs: Date.now() - navStart,
        progressEvents,
        contributions: state.getContributions(),
      };

      const identity = await page.evaluate(() => ({
        localStorageAnon: window.localStorage.getItem('zcout_anon_id'),
        cookies: document.cookie,
      }));
      report.identity = identity;

      const locked = page.locator('[data-nav-item="my-scouting"][data-nav-state="locked"]');
      await locked.waitFor({ timeout: 120000 });
      assert((await locked.count()) === 1, 'My Scouting should stay locked at 1/2');

      await capture(page, 'homepage-1-2-after-reload');
      await page.close();
    }

    {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      await installStatefulDebugProgress(page, 0);
      await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 180000 });
      await waitForProgressCounter(page, '0/2');
      await capture(page, 'homepage-0-2');

      await clickFirstDuelWinner(page);
      await page.waitForTimeout(2500);
      await waitForProgressCounter(page, '1/2', 180000);

      await page.reload({ waitUntil: 'domcontentloaded', timeout: 180000 });
      await waitForProgressCounter(page, '1/2');
      await capture(page, 'homepage-1-2-after-vote-reload');

      await clickFirstDuelWinner(page);
      await page.waitForTimeout(2500);
      await waitForProgressCounter(page, '0/100', 180000);

      const unlocked = page.locator('[data-nav-item="my-scouting"][data-nav-state="unlocked"]');
      await unlocked.waitFor({ timeout: 120000 });

      const bubble = page.locator('text=My Scouting unlocked');
      await bubble.waitFor({ timeout: 120000 });
      assert(
        (await page.locator('text=Your personal scouting dashboard is now available.').count()) > 0,
        'bubble description missing',
      );

      const anonId = await page.evaluate(() => window.localStorage.getItem('zcout_anon_id'));
      const bubbleKey = `zcout_bubble_my_scouting_unlocked:anon:${anonId}`;
      const seenBeforeClose = await page.evaluate(
        (key) => window.localStorage.getItem(key),
        bubbleKey,
      );
      report.bubble.seenBeforeClose = seenBeforeClose;

      await capture(page, 'bubble-after-unlock');

      await page.getByRole('button', { name: 'Dismiss My Scouting unlocked message' }).click();
      await page.waitForTimeout(400);
      const seenAfterClose = await page.evaluate(
        (key) => window.localStorage.getItem(key),
        bubbleKey,
      );
      report.bubble.seenAfterClose = seenAfterClose;
      report.bubble.key = bubbleKey;
      report.bubble.semantics = 'seen written on close only';

      await page.reload({ waitUntil: 'domcontentloaded', timeout: 180000 });
      await waitForProgressCounter(page, '0/100');
      const bubbleAfterReload = page.locator('text=My Scouting unlocked');
      assert((await bubbleAfterReload.count()) === 0, 'bubble should not return after close + reload');
      await capture(page, 'homepage-0-100-unlocked');

      await page.close();
    }

    {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      await installStatefulDebugProgress(page, 2);
      await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 180000 });
      await waitForProgressCounter(page, '0/100');
      const bubble = page.locator('text=My Scouting unlocked');
      await page.waitForTimeout(1500);
      assert((await bubble.count()) === 0, 'bubble must not show on initial unlocked GET');
      await page.close();
    }

    for (const viewport of VIEWPORTS) {
      const page = await browser.newPage({
        viewport: { width: viewport.width, height: viewport.height },
      });
      await installStatefulDebugProgress(page, 1);
      await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 180000 });
      await waitForProgressCounter(page, '1/2');
      const typo = await readNavTypography(page);
      report.typography[viewport.name] = typo;
      assertTypographyMatch(typo.duels, typo.myScoutingLocked, `${viewport.name} locked`);
      await capture(page, `navbar-locked-${viewport.name}`);
      await page.close();
    }

    {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      await installStatefulDebugProgress(page, 2);
      await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 180000 });
      await waitForProgressCounter(page, '0/100');
      const typo = await readNavTypography(page);
      report.typography.unlockedDesktop = typo;
      assertTypographyMatch(typo.duels, typo.myScoutingUnlocked, 'unlocked desktop');
      await capture(page, 'navbar-unlocked-desktop-1440');
      await page.close();
    }

    {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      await page.route('**/api/my-scouting**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            scouting_progress: buildDebugProgress(2),
            stats: { duels: 2, players_rated: 2, scout_reports: 0 },
            recent_contributions: [],
          }),
        });
      });
      await installStatefulDebugProgress(page, 2);
      await page.goto(`${BASE}/my-scouting`, { waitUntil: 'domcontentloaded', timeout: 180000 });
      await page.waitForSelector('text=TEMPORARY SCOUTING RECORD', { timeout: 120000 });
      const loginLink = page.locator('main').getByRole('link', { name: 'Log in' });
      await loginLink.waitFor({ timeout: 120000 });
      const bodyText = await page.locator('body').innerText();
      assert(!/sign in/i.test(bodyText), 'anonymous my-scouting must not show Sign in');
      assert(!/sign up/i.test(bodyText), 'anonymous my-scouting must not show Sign up');
      assert(bodyText.includes('Log in'), 'anonymous my-scouting should show Log in');
      report.authTexts.anonymousMyScouting = bodyText.includes('Log in');
      await capture(page, 'anonymous-my-scouting-log-in-mobile');
      await page.close();
    }

    if (process.env.VERIFY_REAL_BFF === '1') {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      const progressLog = [];
      page.on('response', async (response) => {
        if (!response.url().includes('/api/scouting/progress')) return;
        progressLog.push({
          status: response.status(),
          body: await response.text().catch(() => ''),
        });
      });

      const state = await installRealBffProgress(page, 0);
      await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 180000 });
      await waitForProgressCounter(page, '0/2');
      await clickFirstDuelWinner(page);
      await page.waitForTimeout(4000);
      await waitForProgressCounter(page, '1/2', 180000);
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 180000 });
      await waitForProgressCounter(page, '1/2', 180000);
      report.realBff = { progressLog, contributions: state.getContributions() };
      await page.close();
    }

    await mkdir(SHOT_DIR, { recursive: true });
    await writeFile(REPORT_PATH, JSON.stringify(report, null, 2));

    console.log('verify-my-scouting-final: OK');
    console.log(`screenshots: ${SHOT_DIR}`);
    console.log(`report: ${REPORT_PATH}`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error('verify-my-scouting-final: FAILED');
  console.error(error);
  process.exit(1);
});
