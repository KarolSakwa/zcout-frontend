import { chromium } from 'playwright';
import {
  installPlayerProfileMocks,
  startMockPlayerApiServer,
} from './lib/verify-data-mocks.mjs';

const DEFAULT_BASE = process.env.VERIFY_BASE_URL || 'http://localhost:3000';
const PLAYER_PATH = process.env.VERIFY_PLAYER_PATH || '/players/1';

const PROFILE_VIEWPORTS = [320, 360, 390, 430, 560, 700, 760, 761, 980, 1200, 1440];
const MODAL_VIEWPORTS = [
  { width: 320, height: 568 },
  { width: 360, height: 640 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 700, height: 800 },
  { width: 1440, height: 900 },
];

async function ensureMockBackend() {
  const port = Number(process.env.VERIFY_MOCK_API_PORT || 3999);
  const baseUrl = `http://127.0.0.1:${port}`;
  try {
    const probe = await fetch(`${baseUrl}/api/players/1`);
    if (probe.ok) {
      return {
        port,
        baseUrl,
        close: async () => {},
      };
    }
  } catch {
    // start fresh mock below
  }
  return startMockPlayerApiServer(port);
}

async function gotoProfile(page, base, mockUrl) {
  const response = await page.goto(`${base}${PLAYER_PATH}`, {
    waitUntil: 'domcontentloaded',
    timeout: 180000,
  });

  const status = response?.status() ?? 0;
  if (status >= 400) {
    throw new Error(`GET ${PLAYER_PATH} returned HTTP ${status}`);
  }

  const loaded = await page
    .waitForSelector('main section', { timeout: 120000 })
    .then(() => true)
    .catch(() => false);

  if (!loaded) {
    const bodyText = await page.evaluate(() => (document.body?.innerText || '').slice(0, 300));
    throw new Error(
      `Player profile topCard not rendered at ${base}${PLAYER_PATH}. Start next with BACKEND_URL=${mockUrl}. Body: ${bodyText.replace(/\s+/g, ' ').trim()}`,
    );
  }

  await page.waitForTimeout(500);
}

async function measureProfile(page, width) {
  await page.setViewportSize({ width, height: 900 });
  await page.waitForTimeout(250);

  return page.evaluate(() => {
    const round = (n) => Math.round(n * 100) / 100;
    const topCard = document.querySelector('main section');
    const reportBtn = [...document.querySelectorAll('button')].find((el) =>
      /scout report/i.test(el.textContent || ''),
    );
    const radar = document.querySelector('[aria-label="Player radar chart"]');
    const identity = topCard?.querySelector('h1')?.parentElement ?? null;
    const overall = [...(topCard?.querySelectorAll('div') ?? [])].find(
      (el) => el.textContent?.trim() === 'OVERALL',
    )?.parentElement;
    const grid = topCard?.querySelector(':scope > div:last-child > div');
    const viewport = document.documentElement.clientWidth;
    const scrollWidth = document.documentElement.scrollWidth;

    const gridStyle = grid ? getComputedStyle(grid) : null;
    const topMobile = gridStyle
      ? gridStyle.display === 'grid' && gridStyle.gridTemplateAreas.includes('radar')
      : false;

    const topCardRect = topCard?.getBoundingClientRect();
    const reportRect = reportBtn?.getBoundingClientRect();
    const radarRect = radar?.getBoundingClientRect();
    const identityRect = identity?.getBoundingClientRect();
    const overallRect = overall?.getBoundingClientRect();

    const identityOverlapsOverall =
      identityRect && overallRect
        ? !(
            identityRect.right <= overallRect.left + 1 ||
            overallRect.right <= identityRect.left + 1 ||
            identityRect.bottom <= overallRect.top + 1 ||
            overallRect.bottom <= identityRect.top + 1
          )
        : false;

    return {
      viewport,
      scrollWidth,
      horizontalOverflow: scrollWidth > viewport + 1,
      topCard: topCardRect ? { w: round(topCardRect.width), right: round(topCardRect.right) } : null,
      reportBtn: reportRect
        ? { w: round(reportRect.width), right: round(reportRect.right) }
        : null,
      radar: radarRect
        ? { w: round(radarRect.width), h: round(radarRect.height), right: round(radarRect.right) }
        : null,
      identityOverlapsOverall,
      topMobile,
    };
  });
}

function checkProfile(width, m) {
  const issues = [];

  if (width <= 760 && m.horizontalOverflow) {
    issues.push(`horizontal-overflow scroll=${m.scrollWidth} viewport=${m.viewport}`);
  }

  if (width <= 760) {
    if (!m.topMobile) issues.push('mobile-grid-inactive');
    if (m.topCard && m.reportBtn && m.reportBtn.right > m.topCard.right + 1) {
      issues.push(`report-overflow right=${m.reportBtn.right} card=${m.topCard.right}`);
    }
    if (m.topCard && m.radar && m.radar.right > m.topCard.right + 1) {
      issues.push(`radar-overflow right=${m.radar.right} card=${m.topCard.right}`);
    }
    if (m.identityOverlapsOverall) issues.push('identity-overall-overlap');
  } else if (width >= 761) {
    if (m.topMobile) issues.push('mobile-grid-leaked');
  }

  return issues;
}

async function testModal(page, { width, height }) {
  await page.setViewportSize({ width, height });
  await page.waitForTimeout(250);

  const reportBtn = page.getByRole('button', { name: /scout report/i }).first();
  await reportBtn.click({ timeout: 30000 });
  await page.getByRole('button', { name: 'Submit' }).waitFor({ timeout: 30000 });
  await page.waitForTimeout(400);

  const beforeClose = await page.evaluate(() => {
    const submit = [...document.querySelectorAll('button')].find(
      (el) => el.textContent?.trim() === 'Submit',
    );
    const body = submit?.parentElement?.parentElement ?? null;
    const panel = body?.parentElement ?? null;
    const header = panel?.firstElementChild ?? null;
    const panelStyle = panel ? getComputedStyle(panel) : null;
    const bodyStyle = body ? getComputedStyle(body) : null;

    return {
      bodyOverflow: document.body.style.overflow,
      panelDisplay: panelStyle?.display ?? null,
      panelFlexDir: panelStyle?.flexDirection ?? null,
      bodyOverflowY: bodyStyle?.overflowY ?? null,
      bodyScrollable: body ? body.scrollHeight > body.clientHeight + 1 : false,
      headerVisible: header ? header.getBoundingClientRect().height > 0 : false,
      panelBox: panel ? panel.getBoundingClientRect() : null,
      bodyClientH: body?.clientHeight ?? 0,
      bodyScrollH: body?.scrollHeight ?? 0,
      hasSubmit: Boolean(submit),
    };
  });

  const issues = [];
  if (beforeClose.bodyOverflow !== 'hidden') issues.push(`body-overflow=${beforeClose.bodyOverflow}`);
  if (!beforeClose.hasSubmit) issues.push('submit-missing');
  if (beforeClose.panelDisplay !== 'flex') issues.push(`panel-display=${beforeClose.panelDisplay}`);
  if (beforeClose.panelFlexDir !== 'column') issues.push(`panel-flex=${beforeClose.panelFlexDir}`);
  if (beforeClose.bodyOverflowY !== 'auto') issues.push(`body-overflow-y=${beforeClose.bodyOverflowY}`);
  if (!beforeClose.bodyScrollable) issues.push('body-not-scrollable');
  if (!beforeClose.headerVisible) issues.push('header-missing');

  const scrollResult = await page.evaluate(() => {
    const submit = [...document.querySelectorAll('button')].find(
      (el) => el.textContent?.trim() === 'Submit',
    );
    const body = submit?.parentElement?.parentElement ?? null;
    if (!body) return { scrolled: false, scrollTop: 0 };
    const max = body.scrollHeight - body.clientHeight;
    body.scrollTop = max;
    return { scrolled: body.scrollTop > 8, scrollTop: body.scrollTop, max };
  });

  if (!scrollResult.scrolled) issues.push('scroll-top-unchanged');

  const submitVisible = await page.evaluate(() => {
    const submit = [...document.querySelectorAll('button')].find(
      (el) => el.textContent?.trim() === 'Submit',
    );
    const body = submit?.parentElement?.parentElement ?? null;
    const panel = body?.parentElement ?? null;
    if (!submit || !panel) return false;
    const r = submit.getBoundingClientRect();
    const panelR = panel.getBoundingClientRect();
    return r.top >= panelR.top && r.bottom <= panelR.bottom + 1;
  });

  if (!submitVisible) issues.push('submit-not-visible-after-scroll');

  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);

  const afterClose = await page.evaluate(() => ({
    bodyOverflow: document.body.style.overflow,
    submitOpen: Boolean(
      [...document.querySelectorAll('button')].find((el) => el.textContent?.trim() === 'Submit'),
    ),
  }));

  if (afterClose.bodyOverflow === 'hidden') issues.push('body-overflow-not-restored');
  if (afterClose.submitOpen) issues.push('modal-still-open');

  await reportBtn.click({ timeout: 30000 }).catch(() => {});
  await page.getByRole('button', { name: 'Submit' }).waitFor({ timeout: 10000 }).catch(() => {});
  await page.locator('button', { hasText: '×' }).click({ timeout: 10000 }).catch(async () => {
    await page.keyboard.press('Escape');
  });
  await page.waitForTimeout(300);

  return {
    issues,
    bodyScrollable: beforeClose.bodyScrollable,
    scrollTop: scrollResult.scrollTop,
    submitVisible,
  };
}

const browser = await chromium.launch();
const page = await browser.newPage();
await installPlayerProfileMocks(page);

let failed = 0;
let mockBackend = null;
const base = DEFAULT_BASE;

try {
  mockBackend = await ensureMockBackend();
  console.log(`Mock API: ${mockBackend.baseUrl}`);
  console.log(`Base: ${base}`);
  console.log(`Player: ${PLAYER_PATH}`);
  await gotoProfile(page, base, mockBackend.baseUrl);

  console.log('\n=== PROFILE VIEWPORTS ===');
  for (const width of PROFILE_VIEWPORTS) {
    const m = await measureProfile(page, width);
    const issues = checkProfile(width, m);
    const status = issues.length ? `FAIL ${issues.join(', ')}` : 'OK';
    console.log(
      `${width}px | mobile=${m.topMobile} | overflow=${m.horizontalOverflow} | radar=${m.radar?.w}x${m.radar?.h} | ${status}`,
    );
    if (issues.length) failed += 1;
  }

  console.log('\n=== SCOUT REPORT MODAL ===');
  for (const vp of MODAL_VIEWPORTS) {
    await gotoProfile(page, base, mockBackend.baseUrl);
    const result = await testModal(page, vp);
    const status = result.issues.length ? `FAIL ${result.issues.join(', ')}` : 'OK';
    console.log(
      `${vp.width}x${vp.height} | scrollable=${result.bodyScrollable} | scrollTop=${result.scrollTop} | submit=${result.submitVisible} | ${status}`,
    );
    if (result.issues.length) failed += 1;
  }
} catch (error) {
  console.error('ERROR', error?.message || error);
  failed += 1;
} finally {
  await browser.close();
  if (mockBackend) await mockBackend.close();
}

if (failed > 0) {
  console.error(`\nverify-player-profile-responsive: FAILED (${failed} checks)`);
  process.exit(1);
}

console.log('\nverify-player-profile-responsive: PASSED');
