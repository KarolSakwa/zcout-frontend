import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { installScoutingProgressMock, installVerifyDataMocks } from './lib/verify-data-mocks.mjs';

const BASE = process.env.VERIFY_BASE_URL || 'http://localhost:3000';
const SHOT_DIR = join(process.cwd(), 'tmp', 'verify-mobile-navbar');
const REPORT_PATH = join(SHOT_DIR, 'menu-grid-report.json');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function readNavLayout(page) {
  return page.evaluate(() => {
    const brand = document.querySelector('[data-nav-brand]');
    const auth = document.querySelector('[data-nav-auth]');
    const menu = document.querySelector('nav[aria-label="Main"]');
    const search = document.querySelector('[data-nav-search]');
    if (!brand || !auth || !menu || !search) {
      return { missing: true };
    }

    const top = (el) => Math.round(el.getBoundingClientRect().top);
    const bottom = (el) => Math.round(el.getBoundingClientRect().bottom);
    const rect = (el) => {
      const r = el.getBoundingClientRect();
      return {
        left: Math.round(r.left),
        right: Math.round(r.right),
        top: Math.round(r.top),
        bottom: Math.round(r.bottom),
        width: Math.round(r.width),
        height: Math.round(r.height),
      };
    };

    const items = [...menu.querySelectorAll('[data-nav-item]')].map((el) => ({
      id: el.getAttribute('data-nav-item'),
      box: rect(el),
      fontSize: getComputedStyle(el).fontSize,
      letterSpacing: getComputedStyle(el).letterSpacing,
      lineHeight: getComputedStyle(el).lineHeight,
    }));

    const menuStyle = getComputedStyle(menu);
    const lockEl = document.querySelector('[data-nav-item="my-scouting"][data-nav-state="locked"] svg');
    const labelEl =
      document.querySelector('[data-nav-item="my-scouting"][data-nav-state="locked"] span') ??
      document.querySelector('[data-nav-item="my-scouting"][data-nav-state="loading"]');
    const lockBox = lockEl ? rect(lockEl) : null;
    const labelBox = labelEl ? rect(labelEl) : items.find((i) => i.id === 'my-scouting')?.box ?? null;

    const overlaps = [];
    for (let i = 0; i < items.length; i += 1) {
      for (let j = i + 1; j < items.length; j += 1) {
        const a = items[i].box;
        const b = items[j].box;
        const overlap = a.left < b.right && b.left < a.right;
        if (overlap) overlaps.push([items[i].id, items[j].id]);
      }
    }

    let lockOverlapsLabel = false;
    if (lockBox && labelEl) {
      const labelTextBox = rect(labelEl);
      lockOverlapsLabel =
        lockBox.left < labelTextBox.right - 1 &&
        labelTextBox.left < lockBox.right &&
        lockBox.top < labelTextBox.bottom - 1 &&
        labelTextBox.top < lockBox.bottom;
    }

    const doc = document.documentElement;
    return {
      missing: false,
      brandTop: top(brand),
      authTop: top(auth),
      menuTop: top(menu),
      searchTop: top(search),
      menuBottom: bottom(menu),
      menuDisplay: menuStyle.display,
      menuGridTemplate: menuStyle.gridTemplateColumns,
      itemCount: items.length,
      items,
      columnWidths: items.map((item) => item.box.width),
      overlaps,
      horizontalOverflow: doc.scrollWidth > doc.clientWidth + 1,
      lockOverlapsLabel,
      duelsFontSize: items.find((i) => i.id === 'duels')?.fontSize ?? null,
    };
  });
}

async function capture(page, name) {
  await mkdir(SHOT_DIR, { recursive: true });
  await page.screenshot({ path: join(SHOT_DIR, `${name}.png`), fullPage: false });
}

async function installLockedNavMocks(page) {
  await installVerifyDataMocks(page);
  await installScoutingProgressMock(page, {
    scouting_progress: {
      contributions: 1,
      my_scouting_unlocked: false,
      progress_target: 2,
      stage_progress: 1,
      stage_target: 2,
      next_unlock: 'my_scouting',
    },
  });
}

async function main() {
  const report = { viewports: {}, desktop: {} };
  const browser = await chromium.launch({ headless: true });

  try {
    for (const { width, height, name } of [
      { width: 1440, height: 900, name: 'desktop-1440' },
      { width: 1280, height: 720, name: 'desktop-1280' },
      { width: 390, height: 844, name: 'mobile-390' },
      { width: 375, height: 812, name: 'mobile-375' },
      { width: 360, height: 800, name: 'mobile-360' },
      { width: 320, height: 568, name: 'mobile-320' },
    ]) {
      const page = await browser.newPage({ viewport: { width, height } });
      if (width <= 700) {
        await installLockedNavMocks(page);
      } else {
        await installVerifyDataMocks(page);
      }
      await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 180000 });
      await page.waitForSelector('[data-nav-item="duels"]', { timeout: 120000 });

      const layout = await readNavLayout(page);
      assert(!layout.missing, `${name}: navbar landmarks missing`);
      assert(layout.itemCount === 4, `${name}: expected 4 nav items, got ${layout.itemCount}`);

      if (width <= 700) {
        assert(layout.menuDisplay === 'grid', `${name}: menu should be grid`);
        assert(layout.columnWidths.length === 4, `${name}: expected 4 columns`);
        assert(layout.duelsFontSize === '9px', `${name}: expected 9px nav font, got ${layout.duelsFontSize}`);
        assert(layout.overlaps.length === 0, `${name}: label overlap ${JSON.stringify(layout.overlaps)}`);
        assert(!layout.horizontalOverflow, `${name}: horizontal overflow detected`);
        assert(!layout.lockOverlapsLabel, `${name}: lock overlaps my scouting label`);
        const widths = layout.columnWidths;
        const maxDelta = Math.max(...widths) - Math.min(...widths);
        assert(maxDelta <= 2, `${name}: uneven columns ${widths.join(', ')}`);
        report.viewports[name] = {
          columnWidths: widths,
          horizontalOverflow: layout.horizontalOverflow,
          overlaps: layout.overlaps,
          lockOverlapsLabel: layout.lockOverlapsLabel,
        };
        if (width === 390 || width === 320) {
          await capture(page, `navbar-menu-${width}`);
        }
      } else {
        assert(layout.duelsFontSize === '12px', `${name}: expected 12px nav font, got ${layout.duelsFontSize}`);
        report.desktop[name] = { duelsFontSize: layout.duelsFontSize };
        await capture(page, `navbar-${name}`);
      }

      await page.close();
    }

    await mkdir(SHOT_DIR, { recursive: true });
    await writeFile(REPORT_PATH, JSON.stringify(report, null, 2));

    console.log('verify-mobile-navbar: OK');
    console.log(`screenshots: ${SHOT_DIR}`);
    console.log(`report: ${REPORT_PATH}`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error('verify-mobile-navbar: FAILED');
  console.error(error);
  process.exit(1);
});
