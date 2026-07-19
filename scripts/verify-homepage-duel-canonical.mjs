import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = process.env.VERIFY_BASE_URL || 'http://localhost:3000';
const VIEWPORTS = [
  1920, 1721, 1720, 1440, 1361, 1360, 1280, 1025, 1023, 768, 430, 390, 360, 320,
];

const baseline = JSON.parse(
  fs.readFileSync('scripts/fixtures/homepage-duel-baseline-1920.json', 'utf8'),
);
const MAX_CARD = baseline.leftCard.w;
const MAX_ROW = baseline.row.w;
const BASE_CENTER = baseline.center.w;
const TOL = 2.5;

function overlaps(a, b) {
  return !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
}

async function gotoHome(page) {
  await page.goto(BASE + '/', { waitUntil: 'commit', timeout: 180000 });
}

async function measure(page) {
  return page.evaluate(() => {
    const row = document.querySelector('[data-hp-duel-row]');
    if (!row) return { missing: true };
    const leftSlot = row.querySelector('[data-hp-duel-slot="left"]');
    const center = row.querySelector('[data-hp-duel-slot="center"]');
    const rightSlot = row.querySelector('[data-hp-duel-slot="right"]');
    const leftCard =
      leftSlot?.querySelector('[data-homepage="true"]') ||
      leftSlot?.querySelector('[class*="Placeholder"], [class*="placeholder"]') ||
      leftSlot;
    const rightCard =
      rightSlot?.querySelector('[data-homepage="true"]') ||
      rightSlot?.querySelector('[class*="Placeholder"], [class*="placeholder"]') ||
      rightSlot;
    const loader = center?.querySelector('svg') || center?.firstElementChild;
    const box = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        x: +r.left.toFixed(2),
        y: +r.top.toFixed(2),
        w: +r.width.toFixed(2),
        h: +r.height.toFixed(2),
        midX: +((r.left + r.right) / 2).toFixed(2),
        left: +r.left.toFixed(2),
        right: +r.right.toFixed(2),
        top: +r.top.toFixed(2),
        bottom: +r.bottom.toFixed(2),
      };
    };
    const L = box(leftCard);
    const R = box(rightCard);
    const Ls = box(leftSlot);
    const Rs = box(rightSlot);
    const C = box(center);
    const rowB = box(row);
    const Ld = box(loader);
    const cs = getComputedStyle(row);
    return {
      missing: false,
      loading: !row.querySelector('[data-homepage="true"]'),
      row: rowB,
      leftCard: L,
      rightCard: R,
      leftSlot: Ls,
      rightSlot: Rs,
      center: C,
      gapL: Ls && C ? +(C.x - Ls.right).toFixed(2) : null,
      gapR: C && Rs ? +(Rs.x - C.right).toFixed(2) : null,
      cardGap: L && R ? +(R.x - L.right).toFixed(2) : null,
      loader: Ld,
      loaderMid: Ld?.midX ?? C?.midX,
      centerPos: getComputedStyle(center).position,
      cols: cs.gridTemplateColumns,
      gapCss: cs.columnGap || cs.gap,
      hScroll:
        Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) >
        window.innerWidth + 1,
    };
  });
}

async function waitLoaded(page) {
  await page.waitForFunction(
    () => document.querySelectorAll('[data-homepage="true"]').length >= 2,
    null,
    { timeout: 180000 },
  );
  // Allow card inset transform / resize-observer updates to settle.
  await page.waitForTimeout(1500);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
let failed = false;
const jumpPairs = [
  [1721, 1720],
  [1361, 1360],
  [1025, 1023],
];
const byVp = {};

console.log(`Base: ${BASE}`);
console.log(
  `Baseline ${baseline.metadata?.sourceCommit || 'HEAD'} @${
    baseline.metadata?.viewportWidth || 1920
  }: card=${MAX_CARD} row=${MAX_ROW} center=${BASE_CENTER}`,
);
console.log('=== VIEWPORTS (loaded) ===');

for (const width of VIEWPORTS) {
  await page.setViewportSize({ width, height: 1200 });
  await gotoHome(page);
  await waitLoaded(page);
  const m = await measure(page);
  byVp[width] = m;

  const issues = [];
  if (m.missing) issues.push('missing');
  if (m.centerPos === 'absolute') issues.push('center-absolute');
  if (m.leftCard && m.leftCard.w > MAX_CARD + TOL) {
    issues.push(`left>${MAX_CARD}:${m.leftCard.w}`);
  }
  if (m.rightCard && m.rightCard.w > MAX_CARD + TOL) {
    issues.push(`right>${MAX_CARD}:${m.rightCard.w}`);
  }
  if (m.row && m.row.w > MAX_ROW + TOL) issues.push(`row>${MAX_ROW}:${m.row.w}`);
  if (
    m.leftCard &&
    m.rightCard &&
    Math.abs(m.leftCard.w - m.rightCard.w) > TOL
  ) {
    issues.push('unequal');
  }
  if (m.loader && m.leftCard && overlaps(m.loader, m.leftCard)) {
    issues.push('loader∩left');
  }
  if (m.loader && m.rightCard && overlaps(m.loader, m.rightCard)) {
    issues.push('loader∩right');
  }
  if (
    m.row &&
    m.loaderMid != null &&
    Math.abs(m.loaderMid - m.row.midX) > 3
  ) {
    issues.push('loader-not-centered');
  }
  if (m.hScroll) issues.push('h-scroll');

  // Wide enough for full baseline: expect near-canonical sizes
  if (width >= 768 && m.row?.w >= MAX_ROW - 1) {
    if (Math.abs((m.leftCard?.w ?? 0) - MAX_CARD) > TOL) {
      issues.push(`card≠baseline:${m.leftCard?.w}`);
    }
    if (Math.abs((m.center?.w ?? 0) - BASE_CENTER) > TOL) {
      issues.push(`center≠baseline:${m.center?.w}`);
    }
  }

  if (issues.length) failed = true;
  console.log(
    [
      `${width}px`,
      `L=${m.leftCard?.w}`,
      `R=${m.rightCard?.w}`,
      `row=${m.row?.w}`,
      `center=${m.center?.w}`,
      `gapL=${m.gapL}`,
      `gapR=${m.gapR}`,
      `cardGap=${m.cardGap}`,
      `loaderMid=${m.loaderMid}`,
      `overlap=${
        m.loader && m.leftCard && m.rightCard
          ? overlaps(m.loader, m.leftCard) || overlaps(m.loader, m.rightCard)
          : '?'
      }`,
      issues.length ? `FAIL ${issues.join(';')}` : 'OK',
    ].join(' | '),
  );
}

console.log('\n=== JUMP CHECKS ===');
for (const [a, b] of jumpPairs) {
  const A = byVp[a];
  const B = byVp[b];
  const dCard = Math.abs((A?.leftCard?.w ?? 0) - (B?.leftCard?.w ?? 0));
  const dRow = Math.abs((A?.row?.w ?? 0) - (B?.row?.w ?? 0));
  // Forbidden: any side larger than canonical baseline (the HEAD 1720/1360 bug).
  const oversize =
    (A?.leftCard?.w ?? 0) > MAX_CARD + TOL ||
    (B?.leftCard?.w ?? 0) > MAX_CARD + TOL ||
    (A?.row?.w ?? 0) > MAX_ROW + TOL ||
    (B?.row?.w ?? 0) > MAX_ROW + TOL;
  // For 1721/1720 and 1361/1360 the duel chrome width is stable — require no jump.
  // 1025/1023 may change homepage column layout; only oversize is a failure.
  const requireFlat = a === 1721 || a === 1361;
  const bad = oversize || (requireFlat && (dCard > TOL || dRow > TOL));
  if (bad) failed = true;
  console.log(
    `${a}→${b}: Δcard=${dCard.toFixed(2)} Δrow=${dRow.toFixed(2)} oversize=${oversize} ${
      bad ? 'FAIL' : 'OK'
    }`,
  );
}

console.log('\n=== LOADING VS LOADED @1440 ===');
await page.setViewportSize({ width: 1440, height: 1200 });
await gotoHome(page);
await waitLoaded(page);
// First paint has no placeholder row until bootstrapped; force a gated refetch via Skip.
let releaseDuel = () => {};
const duelGate = new Promise((resolve) => {
  releaseDuel = resolve;
});
await page.route('**/api/duels/**', async (route) => {
  await duelGate;
  await route.continue();
});
const skip = page.locator('button', { hasText: /^skip$/i }).first();
await skip.click({ timeout: 30000 }).catch(() => {});
await page
  .waitForFunction(
    () => {
      const row = document.querySelector('[data-hp-duel-row]');
      return row && !row.querySelector('[data-homepage="true"]');
    },
    null,
    { timeout: 15000 },
  )
  .catch(() => {});
await page.waitForTimeout(300);
const loadingM = await measure(page);
releaseDuel();
await waitLoaded(page);
const loadedM = await measure(page);
await page.unroute('**/api/duels/**').catch(() => {});

function slotDiff(label, a, b) {
  if (!a || !b) return `${label}: missing`;
  const dx = Math.abs(a.x - b.x);
  const dw = Math.abs(a.w - b.w);
  return `${label}: Δx=${dx.toFixed(2)} Δw=${dw.toFixed(2)}`;
}

const loadDeltas = [];
for (const [label, a, b] of [
  ['leftSlot', loadingM.leftSlot, loadedM.leftSlot],
  ['rightSlot', loadingM.rightSlot, loadedM.rightSlot],
  ['center', loadingM.center, loadedM.center],
  ['row', loadingM.row, loadedM.row],
]) {
  const line = slotDiff(label, a, b);
  console.log(
    `${line} | loading=${a ? `${a.x}/${a.w}` : '-'} loaded=${b ? `${b.x}/${b.w}` : '-'}`,
  );
  if (a && b) {
    loadDeltas.push(Math.abs(a.x - b.x), Math.abs(a.w - b.w));
  }
}
const maxLoad = loadDeltas.length ? Math.max(...loadDeltas) : 99;
if (!loadingM.row || maxLoad > TOL) failed = true;
console.log(
  `maxLoadingΔ=${maxLoad.toFixed(2)} ${
    loadingM.row && maxLoad <= TOL ? 'PASS' : 'FAIL'
  } (hadRow=${Boolean(loadingM.row)} loadingPlaceholders=${loadingM.loading})`,
);

await browser.close();
console.log(failed ? '\nRESULT: FAIL' : '\nRESULT: PASS');
process.exit(failed ? 1 : 0);
