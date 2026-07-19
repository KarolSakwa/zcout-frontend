/**
 * Focused Featured Player layout verification with real DOM measurements + screenshots.
 * Exit code 1 on any acceptance failure.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.VERIFY_BASE_URL || 'http://localhost:3000';
const VIEWPORTS = [1440, 1024, 768, 700, 430, 390, 360, 320];
/** Local screenshots only — gitignored; not required for pass/fail. */
const OUT_DIR = path.resolve('scripts/fp-layout-artifacts');
const MAX_NAME_TO_ARCHETYPE_GAP = 24;
const MAX_ARCHETYPE_TO_META_GAP = 28;

fs.mkdirSync(OUT_DIR, { recursive: true });

async function loadHome(page, width) {
  await page.setViewportSize({ width, height: 1200 });
  await page.goto(BASE + '/', { waitUntil: 'commit', timeout: 180000 });
  await page.waitForSelector('[data-fp-name]', { timeout: 180000 });
  await page.waitForSelector('[data-fp-archetype] > *, [data-fp-archetype]', {
    timeout: 60000,
  });
  await page.waitForTimeout(1200);
}

async function measure(page) {
  return page.evaluate(() => {
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

    const name = document.querySelector('[data-fp-name]');
    const archetype =
      document.querySelector('[data-fp-archetype] [class*="playerArchetype"]') ||
      document.querySelector('[data-fp-archetype] > *') ||
      document.querySelector('[data-fp-archetype]');
    const meta = document.querySelector('[data-fp-meta]');
    const rank = document.querySelector('[data-fp-rank]');
    const overall = document.querySelector('[data-fp-overall]');
    const radar = document.querySelector('[data-fp-radar]');
    const panel = document.querySelector('[data-fp-panel]');

    const nameR = rect(name);
    const archR = rect(archetype);
    const metaR = rect(meta);
    const rankR = rect(rank);
    const overallR = rect(overall);
    const radarR = rect(radar);
    const panelR = rect(panel);

    const hScroll =
      Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) >
      window.innerWidth + 1;

    return {
      hScroll,
      present: Boolean(name && archetype && meta && rank && overall && radar),
      nameToArchetypeGap:
        nameR && archR ? +(archR.top - nameR.bottom).toFixed(2) : null,
      archetypeToMetaGap:
        archR && metaR ? +(metaR.top - archR.bottom).toFixed(2) : null,
      name: nameR,
      archetype: archR,
      meta: metaR,
      rank: rankR,
      overall: overallR,
      radar: radarR,
      panel: panelR,
      metricsSpan:
        overallR && radarR ? +(radarR.right - overallR.left).toFixed(2) : null,
      overallRadarGap:
        overallR && radarR ? +(radarR.left - overallR.right).toFixed(2) : null,
      rankWidth: rankR?.width ?? null,
      panelWidth: panelR?.width ?? null,
    };
  });
}

function check(width, m) {
  const issues = [];
  if (!m.present) {
    issues.push('fp-dom-missing');
    return issues;
  }
  if (m.hScroll) issues.push('h-scroll');

  if (width > 700) {
    if (m.nameToArchetypeGap == null) issues.push('fp-name-archetype-missing');
    else if (m.nameToArchetypeGap > MAX_NAME_TO_ARCHETYPE_GAP) {
      issues.push(`fp-name-archetype-gap:${m.nameToArchetypeGap}`);
    } else if (m.nameToArchetypeGap < 0) {
      issues.push(`fp-name-archetype-overlap:${m.nameToArchetypeGap}`);
    }
    if (m.archetypeToMetaGap == null) issues.push('fp-archetype-meta-missing');
    else if (m.archetypeToMetaGap > MAX_ARCHETYPE_TO_META_GAP) {
      issues.push(`fp-archetype-meta-gap:${m.archetypeToMetaGap}`);
    }
  } else {
    if (m.rank.top + 1 < m.meta.bottom) {
      issues.push(`fp-rank-not-below-meta:${m.rank.top}<${m.meta.bottom}`);
    }
    if (m.rank.left > m.name.left + m.name.width * 0.55) {
      issues.push('fp-rank-right-column');
    }
    if (m.rankWidth != null && m.panelWidth != null && m.rankWidth > m.panelWidth * 0.7) {
      issues.push(`fp-rank-stretched:${m.rankWidth}`);
    }
    const sideBySide = Math.abs(m.overall.top - m.radar.top) < 40;
    if (sideBySide && m.overallRadarGap != null && m.overallRadarGap > 40) {
      issues.push(`fp-overall-radar-gap:${m.overallRadarGap}`);
    }
    if (
      sideBySide &&
      m.panelWidth &&
      m.overall &&
      m.radar &&
      m.overall.left - m.panel.left < 24 &&
      m.panel.right - m.radar.right < 24 &&
      m.overallRadarGap > 40
    ) {
      issues.push('fp-metrics-stretched');
    }
  }

  return issues;
}

let failed = false;
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

console.log(`Base: ${BASE}`);
console.log('=== FEATURED PLAYER REAL RENDER ===');

for (const width of VIEWPORTS) {
  try {
    await loadHome(page, width);
    const m = await measure(page);
    const issues = check(width, m);
    if (issues.length) failed = true;

    const shot = path.join(OUT_DIR, `fp-${width}.png`);
    const panel = page.locator('[data-fp-panel]');
    if (await panel.count()) {
      await panel.screenshot({ path: shot });
    } else {
      await page.screenshot({ path: shot, fullPage: false });
    }

    console.log(
      [
        `${width}px`,
        `name→arch=${m.nameToArchetypeGap}`,
        `arch→meta=${m.archetypeToMetaGap}`,
        `rankTop=${m.rank?.top}`,
        `metaBottom=${m.meta?.bottom}`,
        `rankLeft=${m.rank?.left}`,
        `rankW=${m.rankWidth}`,
        `metricsSpan=${m.metricsSpan}`,
        `ovrRadarGap=${m.overallRadarGap}`,
        `radarW=${m.radar?.width}`,
        `shot=${path.basename(shot)}`,
        issues.length ? `FAIL ${issues.join('; ')}` : 'OK',
      ].join(' | '),
    );
  } catch (err) {
    failed = true;
    console.log(`${width}px | ERROR ${err.message.split('\n')[0]}`);
  }
}

await browser.close();
console.log(failed ? '\nRESULT: FAIL' : '\nRESULT: PASS');
process.exit(failed ? 1 : 0);
