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

const SCOUT_ATTR_KEYS = [
  'pace',
  'acceleration',
  'stamina',
  'strength',
  'agility',
  'dribbling',
  'finishing',
  'passing',
  'vision',
  'composure',
  'tackling',
  'positioning',
];

export const VERIFY_MOCK_SCOUT_ATTRIBUTES = {
  player_id: 1,
  items: SCOUT_ATTR_KEYS.map((key, index) => ({
    id: index + 1,
    key,
    label: key.charAt(0).toUpperCase() + key.slice(1),
    group: index < 4 ? 'Physical' : index < 8 ? 'Technical' : 'Mental',
  })),
  is_completed: false,
  remaining_attributes_count: SCOUT_ATTR_KEYS.length,
};

export const VERIFY_MOCK_AUTH_USER = {
  id: 99,
  name: 'Verify Scout',
  email: 'verify-scout@zcout.test',
};

const VERIFY_ATTR_GROUPS = ['Technical', 'Mental', 'Physical'];

function buildMockAttribute(id, key, group) {
  return {
    id,
    key,
    label: key.charAt(0).toUpperCase() + key.slice(1),
    group,
    rating: 72 + (id % 9),
    confidence: 0.62,
    votes_count: 48,
    last_vote_at: '2026-01-01T00:00:00Z',
    your_rating: null,
    trend_7d: id % 2 === 0 ? 0.4 : -0.2,
  };
}

const VERIFY_MOCK_ATTR_LIST = [
  ['dribbling', 'Technical'],
  ['finishing', 'Technical'],
  ['passing', 'Technical'],
  ['vision', 'Mental'],
  ['composure', 'Mental'],
  ['positioning', 'Mental'],
  ['pace', 'Physical'],
  ['stamina', 'Physical'],
  ['strength', 'Physical'],
].map(([key, group], index) => buildMockAttribute(index + 1, key, group));

export const VERIFY_MOCK_PLAYER = {
  id: 1,
  name: 'Gabriel Martinelli',
  archetype: { label: 'Inside Forward' },
  date_of_birth: '2001-06-18',
  position: 'LW',
  overall: 84.2,
  overall_confidence: 0.71,
  overall_trend_7d: 0.3,
  previous_player_id: null,
  next_player_id: 2,
  number: 11,
  club: { name: 'Arsenal' },
  country: { name: 'Brazil' },
  radar_axes: [
    { key: 'pace', label: 'Pace', value: 88 },
    { key: 'shooting', label: 'Shooting', value: 79 },
    { key: 'passing', label: 'Passing', value: 76 },
    { key: 'dribbling', label: 'Dribbling', value: 85 },
    { key: 'defending', label: 'Defending', value: 52 },
    { key: 'physical', label: 'Physical', value: 74 },
  ],
  attributes: VERIFY_MOCK_ATTR_LIST,
};

/** Lightweight API stub for SSR player profile during layout verification. */
export async function startMockPlayerApiServer(port = 3999) {
  const { createServer } = await import('node:http');
  const server = createServer((req, res) => {
    const url = new URL(req.url || '/', `http://127.0.0.1:${port}`);
    if (url.pathname === '/api/players/1' || url.pathname === '/api/players/verify') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(VERIFY_MOCK_PLAYER));
      return;
    }
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'not found' }));
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });

  return {
    port,
    baseUrl: `http://127.0.0.1:${port}`,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}

/** Client-side mocks for player profile + Scout Report modal checks. */
export async function installPlayerProfileMocks(page) {
  await installCsrfSupport(page);

  await page.route('**/api/auth/user**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(VERIFY_MOCK_AUTH_USER),
    }),
  );

  await page.route('**/api/scout-report/attributes/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(VERIFY_MOCK_SCOUT_ATTRIBUTES),
    }),
  );

  await page.route('**/api/scout-report**', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      });
      return;
    }
    await route.fallback();
  });

  await page.route('**/api/log-event**', (route) =>
    route.fulfill({ status: 202, contentType: 'application/json', body: '{}' }),
  );
}
