export const MS_LAYOUT_TOL = 1;

export function approx(a, b, tol = MS_LAYOUT_TOL) {
  if (a == null || b == null) return false;
  return Math.abs(Math.round(a) - Math.round(b)) <= tol;
}

export async function collectMyScoutingPrimaryGridMetrics(page) {
  return page.evaluate(() => {
    const rect = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { top: r.top, left: r.left, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
    };

    const summary = document.querySelector('[data-ms-summary-column]');
    const recentColumn = document.querySelector('[data-ms-recent-column]');
    const primaryGrid = document.querySelector('[data-ms-primary-grid]');
    const statCards = document.querySelector('[aria-label="Scouting statistics"]');
    const nextUnlock = document.querySelector('[class*="nextUnlockPanel"]');
    const recentPanel = document.querySelector('[class*="recentPanel"]');
    const header = document.querySelector('h1');
    const yourImpact = document.querySelector('[class*="yourImpactPanel"]');
    const dashboard = document.querySelector('[class*="dashboard"]');
    const pageInner = document.querySelector('[class*="pageInner"]');

    const cards = statCards
      ? [...statCards.querySelectorAll('article')].map((el) => el.getBoundingClientRect().width)
      : [];

    const duels = document.querySelector('[aria-label^="DUELS:"]');
    const players = document.querySelector('[aria-label^="PLAYERS RATED:"]');
    const reports = document.querySelector('[aria-label^="SCOUT REPORTS:"]');

    return {
      viewportWidth: window.innerWidth,
      summaryRect: rect(summary),
      recentColumnRect: rect(recentColumn),
      headerRect: rect(header),
      statRect: rect(statCards),
      nextUnlockRect: rect(nextUnlock),
      recentPanelRect: rect(recentPanel),
      yourImpactRect: rect(yourImpact),
      dashboardRect: rect(dashboard),
      cardWidths: cards,
      summaryContainsHeader: summary?.contains(header) ?? false,
      summaryContainsStats: summary?.contains(statCards) ?? false,
      summaryContainsNextUnlock: summary?.contains(nextUnlock) ?? false,
      recentColumnContainsPanel: recentColumn?.contains(recentPanel) ?? false,
      primaryGridChildCount: primaryGrid?.children.length ?? 0,
      duelsTop: duels?.getBoundingClientRect().top ?? null,
      playersTop: players?.getBoundingClientRect().top ?? null,
      reportsTop: reports?.getBoundingClientRect().top ?? null,
      nextUnlockTop: nextUnlock?.getBoundingClientRect().top ?? null,
      recentTop: recentPanel?.getBoundingClientRect().top ?? null,
      yourImpactTop: yourImpact?.getBoundingClientRect().top ?? null,
      scrollWidth: pageInner?.scrollWidth ?? document.documentElement.scrollWidth,
      clientWidth: pageInner?.clientWidth ?? document.documentElement.clientWidth,
      dashboardScrollWidth: dashboard?.scrollWidth ?? null,
      dashboardClientWidth: dashboard?.clientWidth ?? null,
    };
  });
}

export function assertDesktopPrimaryGrid(layout, label) {
  if (!layout.summaryContainsHeader) {
    throw new Error(`[${label}] header not in summary column`);
  }
  if (!layout.summaryContainsStats) {
    throw new Error(`[${label}] stat cards not in summary column`);
  }
  if (!layout.summaryContainsNextUnlock) {
    throw new Error(`[${label}] Next Unlock not in summary column`);
  }
  if (!layout.recentColumnContainsPanel) {
    throw new Error(`[${label}] Recent Contributions not in recent column`);
  }
  if (layout.primaryGridChildCount !== 2) {
    throw new Error(`[${label}] primary grid expected 2 children, got ${layout.primaryGridChildCount}`);
  }

  const summaryTop = layout.summaryRect?.top ?? layout.headerRect?.top;
  const recentTop = layout.recentColumnRect?.top;
  if (!approx(summaryTop, recentTop)) {
    throw new Error(
      `[${label}] top alignment failed: summary ${summaryTop} vs recent ${recentTop}`,
    );
  }

  if (
    layout.summaryRect &&
    layout.recentColumnRect &&
    layout.recentColumnRect.left <= layout.summaryRect.left + 8
  ) {
    throw new Error(`[${label}] columns are not side by side`);
  }

  if (!approx(layout.statRect?.width, layout.nextUnlockRect?.width)) {
    throw new Error(
      `[${label}] stat grid width ${layout.statRect?.width} != Next Unlock width ${layout.nextUnlockRect?.width}`,
    );
  }

  if (layout.cardWidths.length === 3) {
    const [a, b, c] = layout.cardWidths;
    if (!approx(a, b) || !approx(b, c)) {
      throw new Error(`[${label}] stat card widths differ: ${layout.cardWidths.join(', ')}`);
    }
  }

  if (
    layout.nextUnlockRect &&
    layout.recentPanelRect &&
    layout.recentPanelRect.height > layout.nextUnlockRect.height + 40 &&
    layout.nextUnlockRect.height >= layout.recentPanelRect.height - 2
  ) {
    throw new Error(`[${label}] Next Unlock appears stretched to Recent Contributions height`);
  }

  if (
    layout.yourImpactRect &&
    layout.dashboardRect &&
    layout.yourImpactRect.top <= (layout.recentPanelRect?.bottom ?? 0) - 2
  ) {
    throw new Error(`[${label}] Your Impact should start below primary grid`);
  }

  if (
    layout.yourImpactRect &&
    layout.dashboardRect &&
    !approx(layout.yourImpactRect.width, layout.dashboardRect.width, 2)
  ) {
    throw new Error(
      `[${label}] Your Impact width ${layout.yourImpactRect.width} != dashboard ${layout.dashboardRect.width}`,
    );
  }
}

export function assertMobileStackOrder(layout, label) {
  const tops = [
    ['header', layout.headerRect?.top],
    ['duels', layout.duelsTop],
    ['players', layout.playersTop],
    ['reports', layout.reportsTop],
    ['nextUnlock', layout.nextUnlockTop],
    ['recent', layout.recentTop],
    ['yourImpact', layout.yourImpactTop],
  ].filter(([, top]) => top != null);

  for (let i = 1; i < tops.length; i += 1) {
    const [prevName, prevTop] = tops[i - 1];
    const [name, top] = tops[i];
    if ((top ?? 0) < (prevTop ?? 0) - MS_LAYOUT_TOL) {
      throw new Error(
        `[${label}] mobile order broken: ${name} (${top}) above ${prevName} (${prevTop})`,
      );
    }
  }
}

export function assertNoHorizontalOverflow(layout, label) {
  if (layout.scrollWidth > layout.clientWidth + MS_LAYOUT_TOL) {
    throw new Error(
      `[${label}] horizontal overflow: scroll ${layout.scrollWidth} > client ${layout.clientWidth}`,
    );
  }
}
