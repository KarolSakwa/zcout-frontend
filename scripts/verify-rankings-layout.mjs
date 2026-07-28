import { chromium } from 'playwright';

const BASE = process.env.VERIFY_BASE_URL || 'http://localhost:3000';
const VIEWPORTS = [1440, 1024, 1023, 768, 600, 481, 480, 430, 390, 360, 320];

const DESKTOP_HEADERS = ['#', 'PLAYER', 'CLUB', 'POSITION', 'RATING', 'TREND 7D'];
const MEDIUM_HEADERS = ['#', 'PLAYER', 'POSITION', 'RATING', 'TREND 7D'];
const MOBILE_HEADERS = ['#', 'PLAYER', 'RATING', 'TREND'];

function expectedHeaders(width) {
  if (width >= 1024) return DESKTOP_HEADERS;
  if (width >= 481) return MEDIUM_HEADERS;
  return MOBILE_HEADERS;
}

function approxEqual(a, b, tol = 1) {
  return Math.abs(a - b) <= tol;
}

function rectsOverlap(a, b, pad = 0.5) {
  return !(
    a.right <= b.left + pad ||
    b.right <= a.left + pad ||
    a.bottom <= b.top + pad ||
    b.bottom <= a.top + pad
  );
}

async function gotoRankings(page) {
  const response = await page.goto(`${BASE}/rankings`, {
    waitUntil: 'commit',
    timeout: 180000,
  });

  const status = response?.status() ?? 0;
  if (status >= 400) {
    throw new Error(`GET /rankings returned HTTP ${status}`);
  }

  const tableAppeared = await page
    .waitForSelector('[data-rankings-table]', { timeout: 120000 })
    .then(() => true)
    .catch(() => false);

  if (!tableAppeared) {
    const bodyText = await page.evaluate(() => (document.body?.innerText || '').slice(0, 500));
    const failed = /Failed to load:\s*(\d+)/i.exec(bodyText);
    if (failed) {
      throw new Error(
        `Rankings table not rendered. Backend rankings request failed with status ${failed[1]} (page shows "Failed to load"). Endpoint used by SSR: BACKEND_URL|API_BASE /api/rankings/overall and /api/rankings/meta`,
      );
    }
    throw new Error(
      `Rankings table not rendered within timeout. Body preview: ${bodyText.replace(/\s+/g, ' ').trim() || '(empty)'}`,
    );
  }

  await page
    .waitForFunction(() => document.querySelectorAll('[data-rankings-table] tbody tr').length > 0, null, {
      timeout: 60000,
    })
    .catch(() => {});

  await page.waitForTimeout(500);
}

async function measure(page, width) {
  await page.setViewportSize({ width, height: 900 });
  await page.waitForTimeout(200);

  return page.evaluate(() => {
    const round = (n) => Math.round(n * 100) / 100;
    const wrap = document.querySelector('[data-rankings-table-wrap]');
    const table = document.querySelector('[data-rankings-table]');
    if (!wrap || !table) {
      return { error: 'table-or-wrap-missing' };
    }

    const headers = [...table.querySelectorAll('thead th')].map((th) => {
      const cs = getComputedStyle(th);
      const hidden = cs.display === 'none' || cs.visibility === 'hidden' || th.getBoundingClientRect().width < 0.5;
      const label = (th.innerText || '')
        .replace(/[↑↓]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      return {
        col: th.getAttribute('data-rankings-col'),
        label,
        hidden,
        width: round(th.getBoundingClientRect().width),
      };
    });

    const visibleHeaders = headers.filter((h) => !h.hidden);

    const firstRow = table.querySelector('tbody tr');
    const cells = firstRow
      ? [...firstRow.querySelectorAll('[data-rankings-col]')].map((td) => {
          const cs = getComputedStyle(td);
          const rect = td.getBoundingClientRect();
          const hidden = cs.display === 'none' || cs.visibility === 'hidden' || rect.width < 0.5;
          return {
            col: td.getAttribute('data-rankings-col'),
            hidden,
            width: round(rect.width),
            left: round(rect.left),
            right: round(rect.right),
            top: round(rect.top),
            bottom: round(rect.bottom),
          };
        })
      : [];

    const visibleCells = cells.filter((c) => !c.hidden);
    const byCol = Object.fromEntries(visibleCells.map((c) => [c.col, c]));

    const badge = firstRow?.querySelector('[data-rankings-pos-badge]');
    let badgeInfo = null;
    if (badge) {
      const cs = getComputedStyle(badge);
      const rect = badge.getBoundingClientRect();
      badgeInfo = {
        visible:
          cs.display !== 'none' &&
          cs.visibility !== 'hidden' &&
          rect.width > 0.5 &&
          rect.height > 0.5,
        width: round(rect.width),
        text: (badge.textContent || '').trim(),
      };
    }

    const playerLink = firstRow?.querySelector('a');
    const playerLinkStyle = playerLink ? getComputedStyle(playerLink) : null;

    const wrapRect = wrap.getBoundingClientRect();
    const tableRect = table.getBoundingClientRect();
    const docSW = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);

    return {
      viewport: window.innerWidth,
      wrap: {
        clientWidth: wrap.clientWidth,
        scrollWidth: wrap.scrollWidth,
        width: round(wrapRect.width),
        left: round(wrapRect.left),
        right: round(wrapRect.right),
        overflowX: getComputedStyle(wrap).overflowX,
      },
      table: {
        clientWidth: table.clientWidth,
        scrollWidth: table.scrollWidth,
        width: round(tableRect.width),
        left: round(tableRect.left),
        right: round(tableRect.right),
        minWidth: getComputedStyle(table).minWidth,
        tableLayout: getComputedStyle(table).tableLayout,
      },
      page: {
        scrollWidth: docSW,
        innerWidth: window.innerWidth,
        hasHScroll: docSW > window.innerWidth + 1,
      },
      headers: visibleHeaders.map((h) => h.label),
      headerDetails: visibleHeaders,
      columns: visibleCells.map((c) => ({ col: c.col, width: c.width })),
      rating: byCol.rating || null,
      trend: byCol.trend || null,
      player: byCol.player || null,
      badge: badgeInfo,
      playerEllipsis: playerLinkStyle
        ? {
            overflow: playerLinkStyle.overflow,
            textOverflow: playerLinkStyle.textOverflow,
            whiteSpace: playerLinkStyle.whiteSpace,
          }
        : null,
    };
  });
}

function assertViewport(m, width) {
  const fails = [];
  if (m.error) {
    fails.push(m.error);
    return fails;
  }

  const expected = expectedHeaders(width);
  const got = m.headers;

  if (JSON.stringify(got) !== JSON.stringify(expected)) {
    fails.push(`headers expected [${expected.join(', ')}] got [${got.join(', ')}]`);
  }

  if (m.wrap.scrollWidth > m.wrap.clientWidth + 1) {
    fails.push(
      `table wrap horizontal scroll: scrollWidth=${m.wrap.scrollWidth} clientWidth=${m.wrap.clientWidth}`,
    );
  }

  if (m.page.hasHScroll) {
    fails.push(`page horizontal scroll: scrollWidth=${m.page.scrollWidth} innerWidth=${m.page.innerWidth}`);
  }

  if (m.table.minWidth && m.table.minWidth !== '0px' && parseFloat(m.table.minWidth) > m.wrap.clientWidth) {
    fails.push(`table min-width ${m.table.minWidth} exceeds wrap ${m.wrap.clientWidth}`);
  }

  // Table edges within wrap (1px tolerance for subpixel)
  if (m.table.left < m.wrap.left - 1 || m.table.right > m.wrap.right + 1) {
    fails.push(
      `table edges outside wrap: table[${m.table.left},${m.table.right}] wrap[${m.wrap.left},${m.wrap.right}]`,
    );
  }

  if (!m.rating || !m.trend) {
    fails.push('RATING and/or TREND column missing');
  } else {
    if (rectsOverlap(m.rating, m.trend)) {
      fails.push('RATING and TREND bounding boxes overlap');
    }
    if (m.player && rectsOverlap(m.player, m.rating)) {
      fails.push('PLAYER and RATING bounding boxes overlap');
    }
    if (m.player && rectsOverlap(m.player, m.trend)) {
      fails.push('PLAYER and TREND bounding boxes overlap');
    }
  }

  if (width <= 480) {
    if (!m.badge?.visible) {
      fails.push('mobile position badge not visible');
    }
  } else if (m.badge?.visible) {
    fails.push('position badge should be hidden above 480px');
  }

  if (
    !m.playerEllipsis ||
    m.playerEllipsis.overflow !== 'hidden' ||
    m.playerEllipsis.textOverflow !== 'ellipsis' ||
    m.playerEllipsis.whiteSpace !== 'nowrap'
  ) {
    fails.push('player name missing ellipsis styles');
  }

  // Approx viewport match
  if (!approxEqual(m.viewport, width, 1)) {
    fails.push(`innerWidth ${m.viewport} != requested ${width}`);
  }

  return fails;
}

console.log(`Base: ${BASE}`);
console.log('Loading /rankings...');

const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const page = await browser.newPage();

let loadError = null;
try {
  await gotoRankings(page);
} catch (err) {
  loadError = err;
}

if (loadError) {
  console.error(`ERROR ${loadError.message}`);
  await browser.close();
  process.exit(1);
}

console.log('Loaded. Measuring viewports...\n');

let failed = 0;
const spotlight = [1024, 1023, 481, 480, 390, 320];
const spotlightRows = [];

for (const width of VIEWPORTS) {
  const m = await measure(page, width);
  const fails = assertViewport(m, width);
  const status = fails.length ? 'FAIL' : 'OK';
  if (fails.length) failed += 1;

  const cols = (m.columns || []).map((c) => `${c.col}:${c.width}`).join(' | ');
  console.log(
    [
      `${width}px`,
      status,
      `wrap=${m.wrap?.clientWidth}/${m.wrap?.scrollWidth}`,
      `table=${m.table?.width}`,
      `headers=[${(m.headers || []).join(', ')}]`,
      `badge=${m.badge?.visible ? 'yes' : 'no'}`,
    ].join(' | '),
  );
  console.log(`  cols: ${cols}`);
  if (fails.length) {
    for (const f of fails) console.log(`  ! ${f}`);
  }
  console.log('');

  if (spotlight.includes(width)) {
    spotlightRows.push({
      width,
      status,
      wrapCW: m.wrap?.clientWidth,
      wrapSW: m.wrap?.scrollWidth,
      tableW: m.table?.width,
      headers: m.headers,
      columns: m.columns,
      ratingW: m.rating?.width,
      trendW: m.trend?.width,
      badge: m.badge?.visible,
    });
  }
}

console.log('=== SPOTLIGHT ===');
console.log(JSON.stringify(spotlightRows, null, 2));

await browser.close();

if (failed > 0) {
  console.error(`\nVERIFY_RANKINGS_EXIT:1 (${failed} viewport(s) failed)`);
  process.exit(1);
}

console.log('\nVERIFY_RANKINGS_EXIT:0');
process.exit(0);
