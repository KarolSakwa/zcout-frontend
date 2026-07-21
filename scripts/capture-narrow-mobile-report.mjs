import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3000';
const OUT = path.join('scripts', 'fp-layout-artifacts', 'narrow-mobile');
const WIDTHS = [700, 430, 390, 320];

fs.mkdirSync(OUT, { recursive: true });

async function gotoHome(page) {
  await page.goto(BASE + '/', { waitUntil: 'commit', timeout: 180000 });
  await page.waitForFunction(() => document.body?.innerText?.includes('Current Duel'), null, {
    timeout: 120000,
  }).catch(() => {});
  await page.waitForSelector('[data-hp-duel-row]', { timeout: 120000 }).catch(() => {});
  await page.waitForTimeout(1500);
}

async function measure(page, width) {
  await page.setViewportSize({ width, height: 1400 });
  await gotoHome(page);

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
    const cs = (el) => (el ? getComputedStyle(el) : null);
    const isVisible = (el) => {
      if (!el) return false;
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };

    const brand = document.querySelector('[data-nav-brand]');
    const database = document.querySelector('[data-nav-item="database"]');
    const navLinks = [...document.querySelectorAll('[data-nav-item]')].filter(
      (el) => el.getAttribute('data-nav-item') !== 'database' && isVisible(el),
    );
    const heroSearch = document.querySelector('[data-hero-search]');
    const navSearch = document.querySelector('[data-nav-search]');
    const fpBorder = document.querySelector('[data-fp-panel]')?.closest('[class*="card"]');
    const duelPanel = document.querySelector('[data-hp-duel-panel]');
    const heroSection = document.querySelector('main h1')?.closest('section');

    const cards = [...document.querySelectorAll('[data-homepage="true"]')].map((card) => {
      const name = card.querySelector('[data-hp-card-name]');
      const flag = card.querySelector('[data-hp-card-flag]');
      const pos = card.querySelector('[data-hp-card-pos]');
      const nameStyle = cs(name);
      const lines = name ? name.querySelectorAll('.nameLine').length : 0;
      return {
        nameFont: nameStyle?.fontSize ?? null,
        nameLines: lines,
        flag: rect(flag),
        pos: rect(pos),
        name: rect(name),
      };
    });

    return {
      hScroll:
        Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) >
        window.innerWidth + 1,
      databaseHidden:
        vpWidth <= 430
          ? !database || getComputedStyle(database).display === 'none'
          : isVisible(database),
      firstNavLink: rect(navLinks[0]),
      brand: rect(brand),
      heroSearchVisible: isVisible(heroSearch),
      navSearchVisible: isVisible(navSearch),
      gapHeroFp:
        heroSection && fpBorder
          ? +(rect(fpBorder).top - rect(heroSection).bottom).toFixed(2)
          : null,
      gapFpDuel:
        fpBorder && duelPanel
          ? +(rect(duelPanel).top - rect(fpBorder).bottom).toFixed(2)
          : null,
      cards,
      duelPanel: rect(duelPanel),
    };
  }, width);

  // Reveal NEXT
  const leftCard = page.locator('[data-homepage="true"]').first();
  let next = null;
  if (await leftCard.count()) {
    await leftCard.click({ timeout: 30000 }).catch(() => {});
    await page.waitForSelector('[data-hp-duel-next]', { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(1200);
    next = await page.evaluate(() => {
      const panel = document.querySelector('[data-hp-duel-panel]');
      const btn = document.querySelector('[data-hp-duel-next]');
      if (!panel || !btn) return null;
      const p = panel.getBoundingClientRect();
      const n = btn.getBoundingClientRect();
      return {
        panel: {
          top: +p.top.toFixed(2),
          bottom: +p.bottom.toFixed(2),
          left: +p.left.toFixed(2),
          right: +p.right.toFixed(2),
          height: +p.height.toFixed(2),
        },
        next: {
          top: +n.top.toFixed(2),
          bottom: +n.bottom.toFixed(2),
          left: +n.left.toFixed(2),
          right: +n.right.toFixed(2),
          width: +n.width.toFixed(2),
          height: +n.height.toFixed(2),
        },
        bottomGap: +(p.bottom - n.bottom).toFixed(2),
        inside:
          n.top >= p.top - 1 &&
          n.bottom <= p.bottom + 1 &&
          n.left >= p.left - 1 &&
          n.right <= p.right + 1,
      };
    });
    await page.screenshot({
      path: path.join(OUT, `homepage-${width}-reveal.png`),
      fullPage: true,
    });
    await page.reload({ waitUntil: 'commit', timeout: 180000 }).catch(() => {});
    await page.waitForTimeout(1200);
  }

  await gotoHome(page);
  await page.screenshot({
    path: path.join(OUT, `homepage-${width}.png`),
    fullPage: true,
  });

  return { ...base, next };
}

const browser = await chromium.launch();
const page = await browser.newPage();
const report = {};

for (const width of WIDTHS) {
  console.log(`Measuring ${width}px...`);
  report[width] = await measure(page, width);
  console.log(JSON.stringify(report[width], null, 2));
}

fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
console.log(`\nSaved screenshots + report to ${OUT}`);
await browser.close();
