/** Shared Playwright API mocks for layout verifiers. */

const CSRF_TOKEN = 'verify-mock-csrf-token';

export const VERIFY_MOCK_PAIR = {
  pair_id: 1,
  attribute: 'pace',
  attributeLabel: 'Pace',
  left: {
    id: 101,
    name: 'Kylian Mbappe',
    position: 'ST',
    club: {
      name: 'Real Madrid',
      color_primary: '#1a1a2e',
      color_secondary: '#111827',
    },
    country: { iso2: 'FR' },
    number: 9,
  },
  right: {
    id: 102,
    name: 'Erling Haaland',
    position: 'ST',
    club: {
      name: 'Manchester City',
      color_primary: '#0f3460',
      color_secondary: '#111827',
    },
    country: { iso2: 'NO' },
    number: 9,
  },
};

export const VERIFY_MOCK_RISERS = {
  risers: Array.from({ length: 5 }, (_, i) => ({
    id: `r${i}`,
    playerId: 200 + i,
    player: `Riser Player ${i + 1}`,
    attributeKey: 'pace',
    attributeLabel: 'Pace',
    delta: `+${(1.2 - i * 0.15).toFixed(2)}`,
  })),
  fallers: [],
};

export const VERIFY_MOCK_RECENT_VOTES = {
  items: Array.from({ length: 5 }, (_, i) => ({
    id: `v${i}`,
    leftPlayer: `Left ${i}`,
    rightPlayer: `Right ${i}`,
    leftPlayerId: 400 + i,
    rightPlayerId: 500 + i,
    winnerPlayerId: 400 + i,
    attributeKey: 'pace',
    attributeLabel: 'Pace',
  })),
};

export const VERIFY_MOCK_VOTE_RESPONSE = {
  duel_id: 1,
  players: [
    {
      id: 101,
      rating: 91,
      rating_before: 90.5,
      rating_after: 91,
      delta: 0.5,
      votes_count: 100,
      attribute_rank: 3,
      is_top_ten: true,
    },
    {
      id: 102,
      rating: 89,
      rating_before: 89.2,
      rating_after: 89,
      delta: -0.2,
      votes_count: 100,
      attribute_rank: 8,
      is_top_ten: true,
    },
  ],
  popularity: { votes_a: 55, votes_b: 45 },
};

function mockOrigin() {
  const base = process.env.VERIFY_BASE_URL || 'http://localhost:3000';
  return new URL(base).origin;
}

async function installCsrfSupport(page) {
  const base = process.env.VERIFY_BASE_URL || 'http://localhost:3000';
  const { hostname } = new URL(base);

  await page.context().addCookies([
    {
      name: 'XSRF-TOKEN',
      value: CSRF_TOKEN,
      domain: hostname,
      path: '/',
      sameSite: 'Lax',
    },
  ]);

  await page.route('**/api/auth/csrf', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 204,
      headers: {
        'Set-Cookie': `XSRF-TOKEN=${encodeURIComponent(CSRF_TOKEN)}; Path=/; SameSite=Lax`,
      },
      body: '',
    });
  });
}

export async function installVerifyDataMocks(page, { delayDuelsMs = 0 } = {}) {
  await installCsrfSupport(page);

  await page.route('**/api/duels/next**', async (route) => {
    if (delayDuelsMs > 0) await new Promise((r) => setTimeout(r, delayDuelsMs));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(VERIFY_MOCK_PAIR),
    });
  });
  await page.route('**/api/live/top-movers-summary**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(VERIFY_MOCK_RISERS),
    }),
  );
  await page.route('**/api/live/recent-votes**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(VERIFY_MOCK_RECENT_VOTES),
    }),
  );
  await page.route('**/api/vote', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(VERIFY_MOCK_VOTE_RESPONSE),
    });
  });
  await page.route('**/api/homepage/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '{}',
    }),
  );
  await page.route('**/api/auth/user**', (route) =>
    route.fulfill({ status: 401, contentType: 'application/json', body: '{}' }),
  );
  await page.route('**/api/log-event**', (route) =>
    route.fulfill({ status: 202, contentType: 'application/json', body: '{}' }),
  );
}
