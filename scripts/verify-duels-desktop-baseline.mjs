import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { installVerifyDataMocks } from './lib/verify-data-mocks.mjs';

const BASE = process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3000';
const OUT = join(process.cwd(), 'tmp', 'verify-duels-desktop-baseline');

const TOL = 1.01;

/** e9cd773 CSS-derived expectations */
const EXPECT = {
  1920: {
    cardW: 282,
    nameFs: 18,
    flagW: 22,
    flagH: 14,
    badgeFs: 11,
    numFs: 94,
    clubFs: 12,
    topD: 'contents',
    topM: 'none',
  },
  1440: {
    cardW: 274,
    nameFs: 18,
    flagW: 22,
    flagH: 14,
    badgeFs: 11,
    numFs: 86.4,
    clubFs: 12,
    topD: 'contents',
    topM: 'none',
  },
  1201: {
    cardW: 262,
    nameFs: 13,
    flagW: 20,
    flagH: 13,
    badgeFs: 10,
    numFs: 60.05,
    clubFs: 10,
    topD: 'contents',
    topM: 'none',
  },
};

async function installMocks(page) {
  await installVerifyDataMocks(page);
}

async function measure(page, w) {
  await page.setViewportSize({ width: w, height: 900 });
  await installMocks(page);
  await page.goto(`${BASE}/duels`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-duels-row]', { timeout: 180000 });
  await page.waitForTimeout(1000);
  return page.evaluate(() => {
    const px = (v) => parseFloat(v) || null;
    const b = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        x: +r.left.toFixed(2),
        y: +r.top.toFixed(2),
        w: +r.width.toFixed(2),
        h: +r.height.toFixed(2),
        fs: px(cs.fontSize),
        lh: cs.lineHeight,
        fw: cs.fontWeight,
        ta: cs.textAlign,
      };
    };
    const card = document.querySelector('[data-duels-slot="left"] article.card');
    const skipWrap = document.querySelector('[data-duels-skip]');
    const skipBtn = [...document.querySelectorAll('button')].find((x) => x.textContent?.trim() === 'Skip');
    const num = card?.querySelector('.number');
    const numBox = b(num);
    const cardBox = b(card);
    if (numBox && cardBox) {
      numBox.cx = +(numBox.x + numBox.w / 2).toFixed(2);
      numBox.cy = +(numBox.y + numBox.h / 2).toFixed(2);
    }
    return {
      ox: Math.max(document.documentElement.scrollWidth - innerWidth, document.body.scrollWidth - innerWidth),
      card: cardBox,
      topRow: b(card?.querySelector('.top')),
      flagWrap: b(card?.querySelector('.flag')),
      flagImg: b(card?.querySelector('.flag img')),
      name: b(card?.querySelector('.top .name')),
      badge: b(card?.querySelector('.posBadge')),
      badgeTxt: b(card?.querySelector('.posText')),
      number: numBox,
      club: b(card?.querySelector('.club')),
      bottom: b(card?.querySelector('.bottom')),
      skipWrap: b(skipWrap),
      skipBtn: b(skipBtn),
      topD: card ? getComputedStyle(card.querySelector('.topDesktop')).display : null,
      topM: card ? getComputedStyle(card.querySelector('.topMobile')).display : null,
    };
  });
}

function near(a, b, tol = TOL) {
  return a == null && b == null ? true : Math.abs(a - b) <= tol;
}

(async () => {
  await mkdir(OUT, { recursive: true });
  let ok = true;
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ deviceScaleFactor: 1 });

  for (const w of [1920, 1440, 1201]) {
    const m = await measure(page, w);
    const e = EXPECT[w];
    const checks = [
      ['card.w', m.card?.w, e.cardW],
      ['name.fs', m.name?.fs, e.nameFs],
      ['flag.w', m.flagImg?.w, e.flagW],
      ['flag.h', m.flagImg?.h, e.flagH],
      ['badgeTxt.fs', m.badgeTxt?.fs, e.badgeFs],
      ['number.fs', m.number?.fs, e.numFs],
      ['club.fs', m.club?.fs, e.clubFs],
      ['topD', null, e.topD],
      ['topM', null, e.topM],
    ];
    console.log(`\n@${w}px`);
    for (const [label, got, exp] of checks) {
      if (label === 'topD') {
        if (m.topD !== e.topD) {
          ok = false;
          console.log(`  FAIL ${label}: got=${m.topD} exp=${e.topD}`);
        } else console.log(`  OK ${label}=${m.topD}`);
        continue;
      }
      if (label === 'topM') {
        if (m.topM !== e.topM) {
          ok = false;
          console.log(`  FAIL ${label}: got=${m.topM} exp=${e.topM}`);
        } else console.log(`  OK ${label}=${m.topM}`);
        continue;
      }
      if (!near(got, exp, label.includes('fs') ? 0.5 : TOL)) {
        ok = false;
        console.log(`  FAIL ${label}: got=${got} exp=${exp}`);
      } else {
        console.log(`  OK ${label}: ${got}`);
      }
    }
    if (m.skipBtn?.w !== 190) {
      ok = false;
      console.log(`  FAIL skipBtn.w: ${m.skipBtn?.w}`);
    } else console.log(`  OK skipBtn.w: 190`);
    if (m.ox > 2) {
      ok = false;
      console.log(`  FAIL overflowX: ${m.ox}`);
    }
    if (w === 1920) await page.screenshot({ path: join(OUT, 'current-duels-1920.png'), fullPage: true });
    if (w === 1440) await page.screenshot({ path: join(OUT, 'current-duels-1440.png'), fullPage: true });
  }

  for (const w of [390]) {
    await page.setViewportSize({ width: w, height: 700 });
    await installMocks(page);
    await page.goto(`${BASE}/duels`);
    await page.waitForSelector('[data-duels-row]');
    await page.screenshot({ path: join(OUT, 'current-duels-390.png'), fullPage: true });
    const m = await page.evaluate(() => {
      const c = document.querySelector('[data-duels-slot="left"] article.card');
      const b = (el) => {
        const r = el.getBoundingClientRect();
        return { w: +r.width.toFixed(1), h: +r.height.toFixed(1) };
      };
      return {
        card: b(c),
        nameFs: getComputedStyle(c.querySelector('[data-card-name] .name')).fontSize,
        clubFs: getComputedStyle(c.querySelector('.club')).fontSize,
        numFs: getComputedStyle(c.querySelector('.number')).fontSize,
        topM: getComputedStyle(c.querySelector('.topMobile')).display,
      };
    });
    console.log(`\n@390 mobile`, m);
    if (m.topM !== 'grid' || parseFloat(m.nameFs) !== 8 || parseFloat(m.clubFs) !== 7) ok = false;
  }

  try {
    await page.setViewportSize({ width: 390, height: 900 });
    await installMocks(page);
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 180000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: join(OUT, 'current-homepage-390.png'), fullPage: true });
  } catch (err) {
    console.warn('homepage screenshot skipped:', err.message || err);
  }

  await browser.close();
  if (!ok) {
    console.error('\nverify-duels-desktop-baseline: FAILED');
    process.exit(1);
  }
  console.log('\nverify-duels-desktop-baseline: PASSED');
})();
