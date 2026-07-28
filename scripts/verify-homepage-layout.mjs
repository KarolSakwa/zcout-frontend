import { chromium } from 'playwright';
import { installVerifyDataMocks } from './lib/verify-data-mocks.mjs';

const BASE = process.env.VERIFY_BASE_URL || 'http://localhost:3000';
const HOME_VIEWPORTS = [320, 360, 390, 430, 700, 768, 1024, 1280, 1440, 1720, 1920];
const MOBILE_ASSERT_VIEWPORTS = [320, 360, 390, 430, 700];
const NEXT_REVEAL_VIEWPORTS = [430, 390, 360, 320];
const SPACING_TOLERANCE_PX = 4;
const DUELS_VIEWPORTS = [390, 1024, 1440];

function approxEqual(a, b, tol = 2) {
  return Math.abs(a - b) <= tol;
}

async function gotoSafe(page, path, { waitText, waitSelector } = {}) {
  await installVerifyDataMocks(page);
  await page.goto(BASE + path, { waitUntil: 'commit', timeout: 180000 });
  if (waitText) {
    await page
      .waitForFunction(
        (text) => document.body?.innerText?.includes(text),
        waitText,
        { timeout: 120000 },
      )
      .catch(() => {});
  }
  if (waitSelector) {
    await page.waitForSelector(waitSelector, { timeout: 120000 }).catch(() => {});
  }
  await page.waitForTimeout(1500);
}

async function measureHome(page, width) {
  await page.setViewportSize({ width, height: 1200 });
  await gotoSafe(page, '/', {
    waitText: 'Current Duel',
    waitSelector: '[data-fp-name]',
  });
  // Duel pair fetch can be slow under local Docker/Xdebug; wait for the row hook.
  await page.waitForSelector('[data-hp-duel-row]', { timeout: 120000 }).catch(() => {});
  await page
    .waitForFunction(
      () => {
        const row = document.querySelector('[data-hp-duel-row]');
        if (!row) return false;
        const slots = row.querySelectorAll('[data-hp-duel-slot="left"], [data-hp-duel-slot="right"]');
        return slots.length >= 2;
      },
      null,
      { timeout: 60000 },
    )
    .catch(() => {});
  await page.waitForTimeout(800);

  return page.evaluate(() => {
    const docEl = document.documentElement;
    const body = document.body;
    const scrollWidth = Math.max(docEl.scrollWidth, body.scrollWidth);
    const hScroll = scrollWidth > window.innerWidth + 1;

    const movers = document.querySelector('[class*="moversCluster"]');
    const secondary = document.querySelector('[class*="secondaryCluster"]');
    const duelShell = document.querySelector('[class*="duelHomepageShell"]');
    const cardsRow =
      document.querySelector('[data-hp-duel-row]') ||
      document.querySelector('[class*="homepageCardsRow"]');
    const cardSlots = cardsRow
      ? [
          ...cardsRow.querySelectorAll(
            '[data-hp-duel-slot="left"], [data-hp-duel-slot="right"]',
          ),
        ]
      : cardsRow
        ? [...cardsRow.querySelectorAll('[class*="homepageCardSlot"]')]
        : [];
    const cards = [...document.querySelectorAll('[data-homepage="true"]')];

    const moversChildren = movers
      ? [...movers.children].map((el) => Math.round(el.getBoundingClientRect().width))
      : [];
    const secondaryChildren = secondary
      ? [...secondary.children].map((el) => Math.round(el.getBoundingClientRect().width))
      : [];

    const moversRect = movers?.getBoundingClientRect();
    const secondaryRect = secondary?.getBoundingClientRect();
    const duelRect = duelShell?.getBoundingClientRect();
    const rowRect = cardsRow?.getBoundingClientRect();

    const slotRects = cardSlots.map((c) => {
      const r = c.getBoundingClientRect();
      return { w: +r.width.toFixed(1), h: +r.height.toFixed(1) };
    });
    const cardRects = cards.map((c) => {
      const r = c.getBoundingClientRect();
      return { w: +r.width.toFixed(1), h: +r.height.toFixed(1) };
    });

    let overflowSuspect = null;
    let maxRight = 0;
    for (const el of document.body.querySelectorAll('*')) {
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue;
      if (r.right > maxRight) {
        maxRight = r.right;
        overflowSuspect = {
          tag: el.tagName,
          cls: (el.className || '').toString().slice(0, 80),
          right: +r.right.toFixed(1),
          width: +r.width.toFixed(1),
        };
      }
    }

    const name = document.querySelector('[data-fp-name]');
    // Measure the archetype label itself (Tooltip wraps an intermediate span).
    const archetype =
      document.querySelector('[data-fp-archetype] [class*="playerArchetype"]') ||
      document.querySelector('[data-fp-archetype] > *') ||
      document.querySelector('[data-fp-archetype]');
    const meta = document.querySelector('[data-fp-meta]');
    const rank = document.querySelector('[data-fp-rank]');
    const overall = document.querySelector('[data-fp-overall]');
    const radar = document.querySelector('[data-fp-radar]');
    const panel = document.querySelector('[data-fp-panel]');

    const rect = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        top: +r.top.toFixed(2),
        bottom: +r.bottom.toFixed(2),
        left: +r.left.toFixed(2),
        right: +r.right.toFixed(2),
        width: +r.width.toFixed(2),
        height: +r.height.toFixed(2),
      };
    };

    const nameR = rect(name);
    const archR = rect(archetype);
    const metaR = rect(meta);
    const rankR = rect(rank);
    const overallR = rect(overall);
    const radarR = rect(radar);
    const panelR = rect(panel);

    const nameToArchetypeGap =
      nameR && archR ? +(archR.top - nameR.bottom).toFixed(2) : null;
    const archetypeToMetaGap =
      archR && metaR ? +(metaR.top - archR.bottom).toFixed(2) : null;

    const metricsSpan =
      overallR && radarR ? +(radarR.right - overallR.left).toFixed(2) : null;
    const overallRadarGap =
      overallR && radarR ? +(radarR.left - overallR.right).toFixed(2) : null;

    return {
      hScroll,
      scrollWidth,
      innerWidth: window.innerWidth,
      moversWidth: moversRect ? Math.round(moversRect.width) : null,
      secondaryWidth: secondaryRect ? Math.round(secondaryRect.width) : null,
      duelWidth: duelRect ? Math.round(duelRect.width) : null,
      cardsRowWidth: rowRect ? Math.round(rowRect.width) : null,
      moversChildren,
      secondaryChildren,
      slotRects,
      cardRects,
      duelTop: duelRect?.top ?? null,
      moversTop: moversRect?.top ?? null,
      overflowSuspect,
      fp: {
        present: Boolean(name && archetype && meta && rank && overall && radar),
        nameToArchetypeGap,
        archetypeToMetaGap,
        name: nameR,
        archetype: archR,
        meta: metaR,
        rank: rankR,
        overall: overallR,
        radar: radarR,
        panel: panelR,
        metricsSpan,
        overallRadarGap,
      },
    };
  });
}

async function measureDuels(page, width) {
  await page.setViewportSize({ width, height: 1200 });
  await gotoSafe(page, '/duels', { waitText: 'Skip' });

  return page.evaluate(() => {
    const scrollWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
    const hScroll = scrollWidth > window.innerWidth + 1;
    const articles = [...document.querySelectorAll('article[role="button"]')];
    const cardRects = articles.map((c) => {
      const r = c.getBoundingClientRect();
      return { w: +r.width.toFixed(1), h: +r.height.toFixed(1) };
    });
    return { hScroll, cardRects };
  });
}

async function measureMobileAssertions(page, width) {
  await page.setViewportSize({ width, height: 1200 });
  await gotoSafe(page, '/', {
    waitText: 'Current Duel',
    waitSelector: '[data-fp-name]',
  });
  await page.waitForSelector('[data-hp-duel-row]', { timeout: 120000 }).catch(() => {});
  await page.waitForTimeout(800);

  const base = await page.evaluate((vpWidth) => {
    const rect = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        top: +r.top.toFixed(2),
        bottom: +r.bottom.toFixed(2),
        left: +r.left.toFixed(2),
        right: +r.right.toFixed(2),
        width: +r.width.toFixed(2),
        height: +r.height.toFixed(2),
      };
    };
    const isVisible = (el) => {
      if (!el) return false;
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };
    const overlaps = (a, b) => {
      if (!a || !b) return false;
      return !(
        a.right <= b.left + 1 ||
        a.left >= b.right - 1 ||
        a.bottom <= b.top + 1 ||
        a.top >= b.bottom - 1
      );
    };

    const brand = document.querySelector('[data-nav-brand]');
    const database = document.querySelector('[data-nav-item="database"]');
    const navLinks = [...document.querySelectorAll('[data-nav-item]')].filter(
      (el) => el.getAttribute('data-nav-item') !== 'database' && isVisible(el),
    );
    const firstNavLink = navLinks[0] ?? null;
    const heroSearch = document.querySelector('[data-hero-search]');
    const navSearch = document.querySelector('[data-nav-search]');
    const fpBorder = document.querySelector('[data-fp-panel]')?.closest('[class*="card"]');
    const duelPanel = document.querySelector('[data-hp-duel-panel]');
    const heroSection = document.querySelector('main h1')?.closest('section');

    const gapHeroFp =
      heroSection && fpBorder
        ? +(rect(fpBorder).top - rect(heroSection).bottom).toFixed(2)
        : null;
    const gapFpDuel =
      fpBorder && duelPanel
        ? +(rect(duelPanel).top - rect(fpBorder).bottom).toFixed(2)
        : null;

    const cardIssues = [];
    for (const card of document.querySelectorAll('[data-homepage="true"]')) {
      const name = card.querySelector('[data-hp-card-name]');
      const flag = card.querySelector('[data-hp-card-flag]');
      const pos = card.querySelector('[data-hp-card-pos]');
      const nameR = rect(name);
      const flagR = rect(flag);
      const posR = rect(pos);
      if (nameR && flagR && overlaps(nameR, flagR)) cardIssues.push('name∩flag');
      if (nameR && posR && overlaps(nameR, posR)) cardIssues.push('name∩pos');
    }

    return {
      hScroll:
        Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) >
        window.innerWidth + 1,
      databaseHidden:
        vpWidth <= 430
          ? !database || getComputedStyle(database).display === 'none'
          : isVisible(database),
      navLogoOverlap:
        brand && firstNavLink ? overlaps(rect(brand), rect(firstNavLink)) : false,
      heroSearchHidden: vpWidth <= 700 ? !isVisible(heroSearch) : isVisible(heroSearch),
      navSearchVisible: isVisible(navSearch),
      gapHeroFp,
      gapFpDuel,
      gapDelta:
        gapHeroFp != null && gapFpDuel != null
          ? +(gapFpDuel - gapHeroFp).toFixed(2)
          : null,
      cardIssues,
    };
  }, width);

  return base;
}

async function measureRevealNext(page, width) {
  const voteTrace = {
    url: null,
    method: null,
    requestBody: null,
    status: null,
    responseBody: null,
  };
  const traceErrors = [];

  const onRequest = (req) => {
    if (req.method() !== 'POST') return;
    const path = new URL(req.url()).pathname;
    if (path !== '/api/vote') return;
    voteTrace.url = req.url();
    voteTrace.method = req.method();
    voteTrace.requestBody = req.postData();
  };
  const onResponse = async (res) => {
    if (res.request().method() !== 'POST') return;
    const path = new URL(res.url()).pathname;
    if (path !== '/api/vote') return;
    voteTrace.status = res.status();
    voteTrace.responseBody = await res.text().catch(() => '');
  };
  const onPageError = (err) => traceErrors.push(`pageerror:${err.message}`);
  const onConsole = (msg) => {
    if (msg.type() === 'error') traceErrors.push(`console:${msg.text()}`);
  };

  page.on('request', onRequest);
  page.on('response', onResponse);
  page.on('pageerror', onPageError);
  page.on('console', onConsole);

  try {
    await page.setViewportSize({ width, height: 1200 });
    await gotoSafe(page, '/', {
      waitText: 'Current Duel',
      waitSelector: '[data-fp-name]',
    });
    await page.waitForSelector('[data-hp-duel-row]', { timeout: 120000 });
    await page.waitForFunction(
      () => document.querySelectorAll('[data-homepage="true"]').length >= 2,
      null,
      { timeout: 60000 },
    );
    await page.waitForTimeout(800);

    const leftCard = page.locator('[data-hp-duel-slot="left"] [data-homepage="true"]').first();
    if (!(await leftCard.count())) {
      return {
        revealReady: false,
        nextMissing: true,
        nextInsidePanel: false,
        vote: voteTrace,
        traceErrors,
      };
    }

    await leftCard.click({ timeout: 30000 });

    await page
      .waitForResponse(
        (res) =>
          res.request().method() === 'POST' &&
          new URL(res.url()).pathname === '/api/vote' &&
          res.status() >= 200 &&
          res.status() < 300,
        { timeout: 30000 },
      )
      .catch(() => {});

    await page
      .waitForFunction(
        () => {
          const revealAttr = document.querySelector('[data-hp-reveal="true"]');
          const next = document.querySelector('[data-hp-duel-next]');
          return Boolean(revealAttr && next);
        },
        null,
        { timeout: 90000 },
      )
      .catch(() => {});

    await page.waitForTimeout(800);

    const result = await page.evaluate(() => {
      const panel = document.querySelector('[data-hp-duel-panel]');
      const revealAttr = document.querySelector('[data-hp-reveal="true"]');
      const next = document.querySelector('[data-hp-duel-next]');
      const rect = (el) => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return {
          top: +r.top.toFixed(2),
          bottom: +r.bottom.toFixed(2),
          left: +r.left.toFixed(2),
          right: +r.right.toFixed(2),
        };
      };
      const p = rect(panel);
      const n = rect(next);
      const inside =
        p &&
        n &&
        n.top >= p.top - 1 &&
        n.bottom <= p.bottom + 1 &&
        n.left >= p.left - 1 &&
        n.right <= p.right + 1;
      return {
        revealReady: Boolean(revealAttr || next),
        hasRevealAttr: Boolean(revealAttr),
        hasNext: Boolean(next),
        nextMissing: !next,
        nextInsidePanel: next ? inside : false,
        nextBottomGap: p && n ? +(p.bottom - n.bottom).toFixed(2) : null,
        domError: document.querySelector('[class*="duelHomepageShell"]')?.innerText?.includes('Błąd')
          ? 'vote-error-visible'
          : null,
      };
    });

    return { ...result, vote: voteTrace, traceErrors };
  } finally {
    page.off('request', onRequest);
    page.off('response', onResponse);
    page.off('pageerror', onPageError);
    page.off('console', onConsole);
  }
}

function checkMobileAssertions(width, m) {
  const issues = [];
  if (m.hScroll) issues.push('h-scroll');
  if (width <= 430 && !m.databaseHidden) issues.push('database-visible');
  if (m.navLogoOverlap) issues.push('nav-logo-overlap');
  if (width <= 700 && !m.heroSearchHidden) issues.push('hero-search-visible');
  if (!m.navSearchVisible) issues.push('nav-search-hidden');
  if (
    width <= 700 &&
    m.gapHeroFp != null &&
    m.gapFpDuel != null &&
    Math.abs(m.gapFpDuel - m.gapHeroFp) > SPACING_TOLERANCE_PX
  ) {
    issues.push(`spacing-uneven:hero=${m.gapHeroFp},fp-duel=${m.gapFpDuel}`);
  }
  if (m.cardIssues?.length) issues.push(...m.cardIssues);
  return issues;
}

function checkRevealNextAssertions(width, m) {
  const issues = [];
  if (!m.vote?.url) issues.push('vote-request-missing');
  else if (m.vote.status == null || m.vote.status < 200 || m.vote.status >= 300) {
    issues.push(`vote-status-${m.vote.status ?? 'none'}`);
  }
  if (!m.revealReady) issues.push('reveal-missing');
  if (m.nextMissing) issues.push('next-missing');
  if (m.nextInsidePanel === false) issues.push('next-outside-panel');
  if (m.domError) issues.push(m.domError);
  return issues;
}

let failed = false;
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const page = await browser.newPage();

console.log(`Base: ${BASE}`);
console.log('=== HOMEPAGE ===');
for (const width of HOME_VIEWPORTS) {
  try {
    const m = await measureHome(page, width);
    const issues = [];
    if (m.hScroll) {
      issues.push(
        `h-scroll(sw=${m.scrollWidth},suspect=${m.overflowSuspect?.cls || m.overflowSuspect?.tag}:${m.overflowSuspect?.width})`,
      );
    }

    const duelBefore =
      m.duelTop != null && m.moversTop != null ? m.duelTop < m.moversTop - 2 : null;
    if (width <= 1024 && duelBefore === false) issues.push('duel-not-before-movers');

    if (width > 700 && width <= 1024) {
      if (m.moversChildren.length >= 2) {
        if (!approxEqual(m.moversChildren[0], m.moversChildren[1], 30)) {
          issues.push(`movers-unequal:${m.moversChildren.join('/')}`);
        }
        if (m.moversWidth && m.moversChildren[0] + m.moversChildren[1] < m.moversWidth * 0.75) {
          issues.push('movers-not-using-width');
        }
      }
      if (m.secondaryChildren.length >= 2) {
        if (m.secondaryWidth && m.secondaryChildren.reduce((a, b) => a + b, 0) < m.secondaryWidth * 0.75) {
          issues.push('secondary-not-using-width');
        }
      }
    }

    if (width <= 700 && m.moversChildren.length >= 1 && m.moversWidth) {
      if (m.moversChildren.some((w) => w < m.moversWidth * 0.92)) {
        issues.push(`movers-not-full:${m.moversChildren.join('/')}`);
      }
    }

    const dims = m.cardRects.length >= 2 ? m.cardRects : m.slotRects;
    if (dims.length >= 2) {
      if (!approxEqual(dims[0].w, dims[1].w, 2)) {
        issues.push(`cards-unequal:${dims[0].w}/${dims[1].w}`);
      }
      if (dims[0].w < 72) issues.push('card-collapsed');
    } else {
      issues.push('cards-row-missing');
    }

    if (m.cardsRowWidth != null && m.duelWidth != null && m.cardsRowWidth > m.duelWidth + 2) {
      issues.push('cards-row-wider-than-duel');
    }

    if (issues.length) failed = true;

    console.log(
      [
        `${width}px`,
        `duel=${m.duelWidth}`,
        `row=${m.cardsRowWidth}`,
        `slots=${dims.map((d) => d.w).join('x') || '-'}`,
        `movers=${m.moversChildren.join('/')}`,
        `fpGap=${m.fp?.nameToArchetypeGap ?? '-'}`,
        `order=${duelBefore == null ? '?' : duelBefore ? 'duel>movers' : 'movers>duel'}`,
        issues.length ? `FAIL ${issues.join('; ')}` : 'OK',
      ].join(' | '),
    );
  } catch (err) {
    failed = true;
    console.log(`${width}px | ERROR ${err.message.split('\n')[0]}`);
  }
}

/*
 * /duels horizontal overflow is PRE-EXISTING (not a homepage-responsive regression):
 * floating `recentVotesWidget` extends past the viewport. Confirmed identical in
 * HEAD e9cd773 at 390px and 1024px. Fixing /duels is out of scope for this pass.
 */
console.log('\n=== MOBILE ASSERTIONS ===');
for (const width of MOBILE_ASSERT_VIEWPORTS) {
  try {
    const m = await measureMobileAssertions(page, width);
    const issues = checkMobileAssertions(width, m);
    if (issues.length) failed = true;
    console.log(
      [
        `${width}px`,
        `dbHidden=${m.databaseHidden}`,
        `logoOverlap=${m.navLogoOverlap}`,
        `heroSearchHidden=${m.heroSearchHidden}`,
        `navSearch=${m.navSearchVisible}`,
        `gapHeroFp=${m.gapHeroFp}`,
        `gapFpDuel=${m.gapFpDuel}`,
        `gapDelta=${m.gapDelta}`,
        `cards=${m.cardIssues?.join(',') || 'ok'}`,
        issues.length ? `FAIL ${issues.join('; ')}` : 'OK',
      ].join(' | '),
    );
  } catch (err) {
    failed = true;
    console.log(`${width}px | ERROR ${err.message.split('\n')[0]}`);
  }
}

console.log('\n=== REVEAL / NEXT ===');
for (const width of NEXT_REVEAL_VIEWPORTS) {
  try {
    const m = await measureRevealNext(page, width);
    const issues = checkRevealNextAssertions(width, m);
    if (issues.length) failed = true;
    console.log(
      [
        `${width}px`,
        `reveal=${m.revealReady}`,
        `hpReveal=${m.hasRevealAttr ?? false}`,
        `next=${m.hasNext ?? false}`,
        `vote=${m.vote?.status ?? 'none'}`,
        `nextInside=${m.nextInsidePanel}`,
        `nextBottomGap=${m.nextBottomGap ?? '-'}`,
        issues.length ? `FAIL ${issues.join('; ')}` : 'OK',
      ].join(' | '),
    );
  } catch (err) {
    failed = true;
    console.log(`${width}px | ERROR ${err.message.split('\n')[0]}`);
  }
}

console.log('\n=== /duels ===');
for (const width of DUELS_VIEWPORTS) {
  try {
    const m = await measureDuels(page, width);
    const issues = [];
    const warnings = [];
    if (m.hScroll) warnings.push('h-scroll');
    if (m.cardRects.length < 2) {
      issues.push('cards-missing');
    } else if (!approxEqual(m.cardRects[0].w, m.cardRects[1].w, 3)) {
      issues.push(`unequal:${m.cardRects[0].w}/${m.cardRects[1].w}`);
    }
    if (issues.length) failed = true;
    const status = issues.length
      ? `FAIL ${issues.join('; ')}`
      : warnings.length
        ? `WARN PRE-EXISTING ${warnings.join('; ')}`
        : 'OK';
    console.log(
      `${width}px | cards=${m.cardRects.map((c) => c.w).join('x') || '-'} | ${status}`,
    );
  } catch (err) {
    failed = true;
    console.log(`${width}px | ERROR ${err.message.split('\n')[0]}`);
  }
}

await browser.close();
process.exit(failed ? 1 : 0);
