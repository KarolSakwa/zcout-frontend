import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import {
  installVerifyDataMocks,
  VERIFY_MOCK_PAIR,
} from './lib/verify-data-mocks.mjs';

const BASE = process.env.VERIFY_BASE_URL || 'http://localhost:3000';
const VIEWPORTS = [
  1920, 1440, 1240, 1201, 1200, 1024, 768, 600, 480, 430, 390, 360, 320,
];
const LOADER_TRIAGE_VIEWPORTS = [1240, 1201];
const LOADER_SCREENSHOT_DIR = join(process.cwd(), 'tmp', 'verify-duels-loader-triage');
const DESKTOP_BASELINE = {
  1920: { cardW: 282, rowW: 720, stageMax: 996 },
  1440: { cardW: 274, rowW: 660, stageMax: 840 },
};

/** Mocked only when live backend is unreachable — real React tree still renders. */
const MOCKED_ENDPOINTS = [
  '/api/duels/next',
  '/api/live/top-movers-summary',
  '/api/live/recent-votes',
  '/api/auth/user',
];

function approxEqual(a, b, tol = 2) {
  return Math.abs(a - b) <= tol;
}

function overlapX(a, b) {
  if (!a || !b) return 0;
  return Math.min(a.right, b.right) - Math.max(a.left, b.left);
}

function overlapY(a, b) {
  if (!a || !b) return 0;
  return Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
}

function overlapArea(a, b) {
  const ox = overlapX(a, b);
  const oy = overlapY(a, b);
  if (ox <= 0 || oy <= 0) return 0;
  return ox * oy;
}

/** Only flag meaningful horizontal intrusion between two boxes. */
function horizontalIntrusion(a, b, pad = 12) {
  return overlapX(a, b) > pad;
}

async function installMocks(page) {
  await installVerifyDataMocks(page);
}

async function gotoDuels(page) {
  await installMocks(page);
  await page.goto(`${BASE}/duels`, {
    waitUntil: 'domcontentloaded',
    timeout: 180000,
  });
  await page.waitForSelector('[data-duels-row]', { timeout: 120000 });
  await page.waitForSelector('[data-duels-page="true"]', { timeout: 30000 });
  await page.waitForTimeout(600);
}

async function measureDuels(page) {
  return page.evaluate(() => {
    const box = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        left: +r.left.toFixed(2),
        right: +r.right.toFixed(2),
        top: +r.top.toFixed(2),
        bottom: +r.bottom.toFixed(2),
        width: +r.width.toFixed(2),
        height: +r.height.toFixed(2),
        display: cs.display,
        position: cs.position,
      };
    };
    const isVisible = (el) => {
      if (!el) return false;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return (
        r.width > 0 &&
        r.height > 0 &&
        cs.display !== 'none' &&
        cs.visibility !== 'hidden'
      );
    };

    const docEl = document.documentElement;
    const body = document.body;
    const row = document.querySelector('[data-duels-row]');
    const stage = document.querySelector('[class*="duelStageCenter"]');
    const leftSlot = document.querySelector('[data-duels-slot="left"]');
    const rightSlot = document.querySelector('[data-duels-slot="right"]');
    const center = document.querySelector('[data-duels-slot="center"]');
    const leftCard =
      leftSlot?.querySelector('article.card') ||
      leftSlot?.querySelector('[data-duels-page="true"]') ||
      leftSlot?.firstElementChild;
    const rightCard =
      rightSlot?.querySelector('article.card') ||
      rightSlot?.querySelector('[data-duels-page="true"]') ||
      rightSlot?.firstElementChild;
    const idleSpacer = center?.querySelector('[data-duels-center-spacer]');
    const centerLoaderRoot =
      center && !idleSpacer && isVisible(center.firstElementChild)
        ? center.firstElementChild
        : null;
    const overlayLoaderRoot = [...document.querySelectorAll('div')].find((el) => {
      const cs = getComputedStyle(el);
      return (
        cs.position === 'fixed' &&
        cs.inset === '0px' &&
        cs.zIndex === '80' &&
        isVisible(el.querySelector('div'))
      );
    });
    const visibleLoaderRoot = centerLoaderRoot || overlayLoaderRoot?.firstElementChild || null;
    const skip = document.querySelector('[data-duels-skip]');
    const risers = document.querySelector('[data-duels-widget="risers"]');
    const votes = document.querySelector('[data-duels-widget="votes"]');

    const contentOverflows = (card) => {
      if (!card) return false;
      const cr = card.getBoundingClientRect();
      const kids = [...card.querySelectorAll('*')];
      for (const el of kids) {
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') continue;
        const r = el.getBoundingClientRect();
        if (r.width <= 0 || r.height <= 0) continue;
        if (
          r.left < cr.left - 1 ||
          r.right > cr.right + 1 ||
          r.top < cr.top - 1 ||
          r.bottom > cr.bottom + 1
        ) {
          return true;
        }
      }
      return false;
    };

    return {
      innerWidth: window.innerWidth,
      scrollWidth: docEl.scrollWidth,
      bodyScrollWidth: body.scrollWidth,
      overflowX: Math.max(
        docEl.scrollWidth - window.innerWidth,
        body.scrollWidth - window.innerWidth,
      ),
      stage: box(stage),
      row: box(row),
      leftCard: box(leftCard),
      rightCard: box(rightCard),
      center: box(center),
      idleSpacer: box(idleSpacer),
      visibleLoader: box(visibleLoaderRoot),
      skip: box(skip),
      risers: box(risers),
      votes: box(votes),
      leftOverflow: contentOverflows(leftCard),
      rightOverflow: contentOverflows(rightCard),
      cols: row ? getComputedStyle(row).gridTemplateColumns : null,
    };
  });
}

async function measureLoadingOverlap(page, width) {
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });

  await page.setViewportSize({ width, height: 900 });
  await installVerifyDataMocks(page);
  await page.route('**/api/duels/next**', async (route) => {
    await gate;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(VERIFY_MOCK_PAIR),
    });
  });

  const nav = page.goto(`${BASE}/duels`, {
    waitUntil: 'domcontentloaded',
    timeout: 180000,
  });
  await page.waitForSelector('[data-duels-row]', { timeout: 30000 });
  await page
    .waitForFunction(
      () => {
        const center = document.querySelector('[data-duels-slot="center"]');
        const spacer = center?.querySelector('[data-duels-center-spacer]');
        if (spacer) return false;
        const centerLoader = center?.firstElementChild;
        if (centerLoader && centerLoader.getBoundingClientRect().width > 20) return true;
        return [...document.querySelectorAll('div')].some((el) => {
          const cs = getComputedStyle(el);
          return (
            cs.position === 'fixed' &&
            cs.inset === '0px' &&
            cs.zIndex === '80' &&
            el.querySelector('div')?.getBoundingClientRect().width > 20
          );
        });
      },
      null,
      { timeout: 30000 },
    )
    .catch(() => {});

  const metrics = await page.evaluate(() => {
    const box = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        left: +r.left.toFixed(2),
        right: +r.right.toFixed(2),
        top: +r.top.toFixed(2),
        bottom: +r.bottom.toFixed(2),
        width: +r.width.toFixed(2),
        height: +r.height.toFixed(2),
      };
    };
    const isVisible = (el) => {
      if (!el) return false;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return (
        r.width > 0 &&
        r.height > 0 &&
        cs.display !== 'none' &&
        cs.visibility !== 'hidden'
      );
    };
    const overlap = (a, b) => {
      if (!a || !b) return { x: 0, y: 0, area: 0 };
      const x = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      return {
        x: +Math.max(0, x).toFixed(2),
        y: +Math.max(0, y).toFixed(2),
        area: +(Math.max(0, x) * Math.max(0, y)).toFixed(2),
      };
    };

    const leftSlot = document.querySelector('[data-duels-slot="left"]');
    const rightSlot = document.querySelector('[data-duels-slot="right"]');
    const center = document.querySelector('[data-duels-slot="center"]');
    const leftCard =
      leftSlot?.querySelector('article.card') ||
      leftSlot?.querySelector('[class*="Placeholder"]') ||
      leftSlot?.firstElementChild;
    const rightCard =
      rightSlot?.querySelector('article.card') ||
      rightSlot?.querySelector('[class*="Placeholder"]') ||
      rightSlot?.firstElementChild;
    const idleSpacer = center?.querySelector('[data-duels-center-spacer]');
    const centerLoaderRoot =
      center && !idleSpacer && isVisible(center.firstElementChild)
        ? center.firstElementChild
        : null;
    const overlayLoaderRoot = [...document.querySelectorAll('div')].find((el) => {
      const cs = getComputedStyle(el);
      return (
        cs.position === 'fixed' &&
        cs.inset === '0px' &&
        cs.zIndex === '80' &&
        isVisible(el.querySelector('div'))
      );
    });
    const visibleLoader = box(centerLoaderRoot || overlayLoaderRoot?.firstElementChild);
    const left = box(leftCard);
    const right = box(rightCard);

    return {
      idleSpacer: box(idleSpacer),
      visibleLoader,
      loaderSource: centerLoaderRoot ? 'center' : overlayLoaderRoot ? 'overlay' : 'none',
      leftCard: left,
      rightCard: right,
      overlapLeft: overlap(visibleLoader, left),
      overlapRight: overlap(visibleLoader, right),
    };
  });

  await mkdir(LOADER_SCREENSHOT_DIR, { recursive: true });
  await page.screenshot({
    path: join(LOADER_SCREENSHOT_DIR, `loading-${width}.png`),
    fullPage: true,
  });

  release();
  await nav;
  await page.waitForSelector('[data-duels-slot="left"] article.card', {
    timeout: 120000,
  });

  return metrics;
}

async function measureLoadingGeometry(page) {
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });

  await installVerifyDataMocks(page);
  await page.route('**/api/duels/next**', async (route) => {
    await gate;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(VERIFY_MOCK_PAIR),
    });
  });

  const nav = page.goto(`${BASE}/duels`, {
    waitUntil: 'domcontentloaded',
    timeout: 180000,
  });
  await page.waitForSelector('[data-duels-row]', { timeout: 30000 });
  const pending = await measureDuels(page);

  release();
  await nav;
  await page.waitForSelector('[data-duels-slot="left"] article.card', {
    timeout: 120000,
  });
  await page.waitForTimeout(600);
  const loaded = await measureDuels(page);

  return { loaded, pending };
}

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  return false;
}

(async () => {
  let ok = true;
  const browser = await chromium.launch({
    headless: true,
    channel: 'chrome',
  });

  console.log(`Base: ${BASE}`);
  console.log(`Mocked endpoints (data only): ${MOCKED_ENDPOINTS.join(', ')}`);

  const results = [];

  for (const w of VIEWPORTS) {
    const page = await browser.newPage({ viewport: { width: w, height: w <= 430 ? 700 : 900 } });
    try {
      await gotoDuels(page);
      const m = await measureDuels(page);
      results.push({ w, ...m });

      console.log(
        `\n[${w}] ox=${m.overflowX.toFixed(1)} card=${m.leftCard?.width} row=${m.row?.width} ` +
          `spacer=${m.idleSpacer?.width ?? '-'} loader=${m.visibleLoader?.width ?? 'none'}`,
      );

      if (m.overflowX > 2) {
        ok = fail(`viewport ${w}: horizontal overflow ${m.overflowX}`);
      }

      if (!m.leftCard || !m.rightCard || !m.risers || !m.votes || !m.skip) {
        ok = fail(`viewport ${w}: missing core elements`);
        await page.close();
        continue;
      }

      if (!approxEqual(m.leftCard.width, m.rightCard.width, 2)) {
        ok = fail(
          `viewport ${w}: unequal cards ${m.leftCard.width} vs ${m.rightCard.width}`,
        );
      }

      if (overlapArea(m.leftCard, m.rightCard) > 4) {
        ok = fail(`viewport ${w}: cards overlap each other`);
      }

      if (m.leftOverflow || m.rightOverflow) {
        ok = fail(`viewport ${w}: card content overflows bounds`);
      }

      if (w > 1200) {
        if (!(m.risers.right <= m.stage.left + 2)) {
          ok = fail(
            `viewport ${w}: risers not to the left of stage (r=${m.risers.right}, stageL=${m.stage.left})`,
          );
        }
        if (!(m.votes.left >= m.stage.right - 2)) {
          ok = fail(
            `viewport ${w}: votes not to the right of stage (l=${m.votes.left}, stageR=${m.stage.right})`,
          );
        }
        const baseline = DESKTOP_BASELINE[w];
        if (baseline) {
          if (!approxEqual(m.leftCard.width, baseline.cardW, 3)) {
            ok = fail(
              `viewport ${w}: desktop card width ${m.leftCard.width} != ${baseline.cardW}`,
            );
          }
          if (!approxEqual(m.row.width, baseline.rowW, 3)) {
            ok = fail(
              `viewport ${w}: desktop row width ${m.row.width} != ${baseline.rowW}`,
            );
          }
        }
      } else {
        if (!(m.skip.bottom <= m.risers.top + 2)) {
          ok = fail(
            `viewport ${w}: skip not above risers (skipB=${m.skip.bottom}, risersT=${m.risers.top})`,
          );
        }
        if (!(m.risers.bottom <= m.votes.top + 2)) {
          ok = fail(
            `viewport ${w}: risers not above votes (risersB=${m.risers.bottom}, votesT=${m.votes.top})`,
          );
        }
        if (!(m.stage.bottom <= m.skip.top + 4)) {
          ok = fail(
            `viewport ${w}: stage not above skip (stageB=${m.stage.bottom}, skipT=${m.skip.top})`,
          );
        }
        if (!approxEqual(m.risers.width, m.votes.width, 4)) {
          ok = fail(
            `viewport ${w}: stacked widgets unequal width (${m.risers.width} vs ${m.votes.width})`,
          );
        }
        if (m.risers.left < -1 || m.votes.left < -1) {
          ok = fail(`viewport ${w}: stacked widget has negative left`);
        }
        if (m.risers.position === 'absolute' || m.votes.position === 'absolute') {
          ok = fail(`viewport ${w}: stacked widgets must not be absolute`);
        }
      }

      if (w <= 1200 && m.skip && m.risers) {
        const skipToRisersGap = m.risers.top - m.skip.bottom;
        if (skipToRisersGap < 10) {
          ok = fail(
            `viewport ${w}: skip→risers gap ${skipToRisersGap.toFixed(1)}px < 10px`,
          );
        }
      }
    } catch (err) {
      ok = fail(`viewport ${w}: ${err.message || err}`);
      console.error(err);
    }
    await page.close();
  }

  for (let i = 1; i < results.length; i++) {
    const prev = results[i - 1];
    const cur = results[i];
    if (!prev.leftCard || !cur.leftCard) continue;
    if (cur.w >= prev.w) continue;
    if (cur.leftCard.width > prev.leftCard.width + 2) {
      ok = fail(
        `card grew when narrowing ${prev.w}→${cur.w}: ${prev.leftCard.width} → ${cur.leftCard.width}`,
      );
    }
  }

  console.log('\n=== Real loader overlap triage @1240 / 1201 ===');
  const loaderTriage = {};
  for (const w of LOADER_TRIAGE_VIEWPORTS) {
    const page = await browser.newPage();
    try {
      const m = await measureLoadingOverlap(page, w);
      loaderTriage[w] = m;
      console.log(
        `@${w}px source=${m.loaderSource} loader=${m.visibleLoader?.width ?? 'none'}×${m.visibleLoader?.height ?? '-'} ` +
          `overlapL=${m.overlapLeft.area}px overlapR=${m.overlapRight.area}px ` +
          `(xL=${m.overlapLeft.x} xR=${m.overlapRight.x})`,
      );
      const intrudes =
        m.loaderSource === 'center' &&
        (m.overlapLeft.x > 12 ||
          m.overlapRight.x > 12 ||
          m.overlapLeft.area > 144 ||
          m.overlapRight.area > 144);
      if (intrudes) {
        ok = fail(
          `loading @${w}: center ZLoader intrudes on cards (L=${m.overlapLeft.area}px² R=${m.overlapRight.area}px²)`,
        );
      } else if (m.loaderSource === 'overlay') {
        console.log(
          `  overlay loader covers viewport by design; informational overlap L=${m.overlapLeft.area}px² R=${m.overlapRight.area}px²`,
        );
      }
    } catch (err) {
      ok = fail(`loading triage @${w}: ${err.message || err}`);
    }
    await page.close();
  }

  {
    const page = await browser.newPage({ viewport: { width: 430, height: 700 } });
    try {
      await gotoDuels(page);
      const { loaded, pending } = await measureLoadingGeometry(page);
      const checks = [
        ['row', loaded.row?.width, pending.row?.width],
        ['left', loaded.leftCard?.width, pending.leftCard?.width],
        ['right', loaded.rightCard?.width, pending.rightCard?.width],
        ['center', loaded.center?.width, pending.center?.width],
      ];
      for (const [label, a, b] of checks) {
        if (a == null || b == null || !approxEqual(a, b, 2)) {
          ok = fail(`loading vs loaded ${label}: ${a} vs ${b}`);
        }
      }
      console.log(
        `\nLoading vs loaded @430: row ${loaded.row?.width}/${pending.row?.width} ` +
          `card ${loaded.leftCard?.width}/${pending.leftCard?.width}`,
      );
    } catch (err) {
      ok = fail(`loading geometry: ${err.message || err}`);
    }
    await page.close();
  }

  {
    const page = await browser.newPage({ viewport: { width: 430, height: 700 } });
    try {
      await gotoDuels(page);
      const m = await measureDuels(page);
      if (m.skip && m.skip.bottom > 700 + 2) {
        ok = fail(
          `430x700: skip bottom ${m.skip.bottom} exceeds viewport (duel core should fit)`,
        );
      }
      console.log(`First screen @430x700: skipBottom=${m.skip?.bottom}`);
    } catch (err) {
      ok = fail(`first screen: ${err.message || err}`);
    }
    await page.close();
  }

  console.log('\n=== Card widths ===');
  for (const r of results) {
    console.log(
      `  ${r.w}: card=${r.leftCard?.width} row=${r.row?.width} stage=${r.stage?.width}`,
    );
  }

  const r1201 = results.find((r) => r.w === 1201);
  const r1200 = results.find((r) => r.w === 1200);
  console.log('\n=== Widget positions 1201 / 1200 ===');
  console.log(
    '1201 risers',
    r1201?.risers && {
      left: r1201.risers.left,
      right: r1201.risers.right,
      top: r1201.risers.top,
      position: r1201.risers.position,
    },
  );
  console.log(
    '1201 votes',
    r1201?.votes && {
      left: r1201.votes.left,
      right: r1201.votes.right,
      top: r1201.votes.top,
      position: r1201.votes.position,
    },
  );
  console.log(
    '1200 risers',
    r1200?.risers && {
      left: r1200.risers.left,
      right: r1200.risers.right,
      top: r1200.risers.top,
      position: r1200.risers.position,
    },
  );
  console.log(
    '1200 votes',
    r1200?.votes && {
      left: r1200.votes.left,
      right: r1200.votes.right,
      top: r1200.votes.top,
      position: r1200.votes.position,
    },
  );

  await browser.close();

  if (!ok) {
    console.error('\nverify-duels-layout: FAILED');
    process.exit(1);
  }
  console.log('\nverify-duels-layout: PASSED');
  process.exit(0);
})().catch((err) => {
  console.error('ERROR:', err);
  process.exit(1);
});
