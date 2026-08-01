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
  await page.waitForSelector('[data-scout-report-overlay]', { timeout: 30000 });
  await page.getByRole('button', { name: 'Submit' }).waitFor({ timeout: 30000 });
  await page.waitForFunction(
    () => {
      const overlay = document.querySelector('[data-scout-report-overlay]');
      return overlay && getComputedStyle(overlay).opacity === '1';
    },
    null,
    { timeout: 5000 },
  );
  await page.waitForTimeout(220);

  const measureModal = () =>
    page.evaluate(() => {
      const overlay = document.querySelector('[data-scout-report-overlay]');
      const panel = document.querySelector('[data-scout-report-panel]');
      const header = document.querySelector('[data-scout-report-header]');
      const scrollBody = document.querySelector('[data-scout-report-scroll-body]');
      const footer = document.querySelector('[data-scout-report-footer]');
      const submit = footer?.querySelector('button');
      const attributeCards = scrollBody?.querySelectorAll('[class*="attributeCard"]') ?? [];
      const lastAttribute = attributeCards[attributeCards.length - 1] ?? null;
      const viewport = {
        width: window.innerWidth,
        height: window.innerHeight,
      };

      const box = (el) => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return {
          top: Math.round(r.top * 100) / 100,
          bottom: Math.round(r.bottom * 100) / 100,
          left: Math.round(r.left * 100) / 100,
          right: Math.round(r.right * 100) / 100,
        };
      };

      const fitsIn = (inner, outer, pad = 1) => {
        if (!inner || !outer) return false;
        return (
          inner.top >= outer.top - pad &&
          inner.bottom <= outer.bottom + pad &&
          inner.left >= outer.left - pad &&
          inner.right <= outer.right + pad
        );
      };

      const overlayBox = box(overlay);
      const panelBox = box(panel);
      const headerBox = box(header);
      const footerBox = box(footer);
      const submitBox = box(submit);
      const viewportBox = { top: 0, bottom: viewport.height, left: 0, right: viewport.width };
      const panelViewportSlop = 12;
      const scrollStyle = scrollBody ? getComputedStyle(scrollBody) : null;
      const panelStyle = panel ? getComputedStyle(panel) : null;
      const panelInViewport = fitsIn(panelBox, viewportBox, panelViewportSlop);

      return {
        bodyOverflow: document.body.style.overflow,
        pageScrollY: window.scrollY,
        horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
        overlayInBody: overlay?.parentElement === document.body,
        overlayTop: overlayBox?.top ?? null,
        overlayBottom: overlayBox?.bottom ?? null,
        viewportHeight: viewport.height,
        panelTop: panelBox?.top ?? null,
        panelBottom: panelBox?.bottom ?? null,
        panelInViewport,
        panelDisplay: panelStyle?.display ?? null,
        panelFlexDir: panelStyle?.flexDirection ?? null,
        scrollOverflowY: scrollStyle?.overflowY ?? null,
        scrollTop: scrollBody?.scrollTop ?? 0,
        scrollable: scrollBody ? scrollBody.scrollHeight > scrollBody.clientHeight + 1 : false,
        submitAtOpen: fitsIn(submitBox, viewportBox, 2),
        submitInPanel: fitsIn(submitBox, panelBox, 2),
        headerInPanel: fitsIn(headerBox, panelBox, 2),
        footerInPanel: fitsIn(footerBox, panelBox, 2),
        headerBox,
        footerBox,
        submitBox,
        lastAttributeBox: box(lastAttribute),
        hasSubmit: Boolean(submit),
        hasScrollBody: Boolean(scrollBody),
        hasOverlay: Boolean(overlay),
      };
    });

  const atOpen = await measureModal();
  const issues = [];

  if (!atOpen.hasOverlay) issues.push('overlay-missing');
  if (!atOpen.overlayInBody) issues.push('overlay-not-in-body');
  if (atOpen.overlayTop == null || Math.abs(atOpen.overlayTop) > 2) {
    issues.push(`overlay-top=${atOpen.overlayTop}`);
  }
  if (
    atOpen.overlayBottom == null ||
    Math.abs(atOpen.overlayBottom - atOpen.viewportHeight) > 2
  ) {
    issues.push(`overlay-bottom=${atOpen.overlayBottom} viewport=${atOpen.viewportHeight}`);
  }
  if (!atOpen.panelInViewport) issues.push('panel-outside-viewport');
  if (atOpen.bodyOverflow !== 'hidden') issues.push(`body-overflow=${atOpen.bodyOverflow}`);
  if (atOpen.pageScrollY > 1) issues.push(`page-scroll-y=${atOpen.pageScrollY}`);
  if (atOpen.horizontalOverflow) issues.push('horizontal-overflow');
  if (!atOpen.hasSubmit) issues.push('submit-missing');
  if (!atOpen.hasScrollBody) issues.push('scroll-body-missing');
  if (atOpen.panelDisplay !== 'flex') issues.push(`panel-display=${atOpen.panelDisplay}`);
  if (atOpen.panelFlexDir !== 'column') issues.push(`panel-flex=${atOpen.panelFlexDir}`);
  if (atOpen.scrollOverflowY !== 'auto') issues.push(`scroll-overflow-y=${atOpen.scrollOverflowY}`);
  if (!atOpen.submitAtOpen) issues.push('submit-not-visible-at-open');
  if (atOpen.scrollTop !== 0) issues.push(`scroll-top-not-zero=${atOpen.scrollTop}`);
  if (!atOpen.headerInPanel) issues.push('header-outside-panel');
  if (!atOpen.footerInPanel) issues.push('footer-outside-panel');

  const headerTopAtOpen = atOpen.headerBox?.top ?? 0;
  const footerBottomAtOpen = atOpen.footerBox?.bottom ?? 0;

  const scrollResult = await page.evaluate(() => {
    const scrollBody = document.querySelector('[data-scout-report-scroll-body]');
    if (!scrollBody) return { scrolled: false, scrollTop: 0 };
    const max = scrollBody.scrollHeight - scrollBody.clientHeight;
    scrollBody.scrollTop = max;
    return { scrolled: scrollBody.scrollTop > 8, scrollTop: scrollBody.scrollTop, max };
  });

  if (!scrollResult.scrolled && atOpen.scrollable) issues.push('scroll-top-unchanged');

  const afterScroll = await measureModal();

  if (Math.abs((afterScroll.headerBox?.top ?? 0) - headerTopAtOpen) > 1) {
    issues.push('header-moved-on-scroll');
  }
  if (Math.abs((afterScroll.footerBox?.bottom ?? 0) - footerBottomAtOpen) > 1) {
    issues.push('footer-moved-on-scroll');
  }
  if (!afterScroll.submitAtOpen) issues.push('submit-not-visible-after-scroll');

  const lastAttrVisible = await page.evaluate(() => {
    const panel = document.querySelector('[data-scout-report-panel]');
    const scrollBody = document.querySelector('[data-scout-report-scroll-body]');
    const footer = document.querySelector('[data-scout-report-footer]');
    const attributeCards = scrollBody?.querySelectorAll('[class*="attributeCard"]') ?? [];
    const lastAttribute = attributeCards[attributeCards.length - 1];
    if (!lastAttribute || !panel || !footer) return false;

    const lastRect = lastAttribute.getBoundingClientRect();
    const footerRect = footer.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();

    return (
      lastRect.bottom <= footerRect.top + 1 &&
      lastRect.top >= panelRect.top &&
      lastRect.bottom <= panelRect.bottom + 1
    );
  });

  if (!lastAttrVisible) issues.push('last-attribute-obscured');

  await page.keyboard.press('Escape');
  await page
    .waitForSelector('[data-scout-report-overlay]', { state: 'detached', timeout: 5000 })
    .catch(() => {});
  await page
    .waitForFunction(() => document.body.style.overflow !== 'hidden', null, { timeout: 5000 })
    .catch(() => {});

  const afterClose = await page.evaluate(() => ({
    bodyOverflow: document.body.style.overflow,
    submitOpen: Boolean(document.querySelector('[data-scout-report-footer]')),
  }));

  if (afterClose.bodyOverflow === 'hidden') issues.push('body-overflow-not-restored');
  if (afterClose.submitOpen) issues.push('modal-still-open');

  return {
    issues,
    scrollable: atOpen.scrollable,
    scrollTop: scrollResult.scrollTop,
    submitAtOpen: atOpen.submitAtOpen,
    overlayTop: atOpen.overlayTop,
    overlayBottom: atOpen.overlayBottom,
    viewportHeight: atOpen.viewportHeight,
    overlayInBody: atOpen.overlayInBody,
    panelTop: atOpen.panelTop,
    panelBottom: atOpen.panelBottom,
    panelInViewport: atOpen.panelInViewport,
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
      `${vp.width}x${vp.height} | overlay=${result.overlayTop}-${result.overlayBottom}/${result.viewportHeight} body=${result.overlayInBody} | panel=${result.panelTop}-${result.panelBottom} inViewport=${result.panelInViewport} | submitAtOpen=${result.submitAtOpen} | ${status}`,
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
