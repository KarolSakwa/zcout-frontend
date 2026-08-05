import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET as getScoutingProgress } from '@/app/api/scouting/progress/route';
import { GET as getMyScouting } from '@/app/api/my-scouting/route';

describe('scouting BFF routes', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ scouting_progress: { contributions: 1 } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it('progress route forwards X-Zcout-Anon from request header', async () => {
    const req = new Request('http://localhost/api/scouting/progress', {
      headers: {
        'x-zcout-anon': 'header-anon-id',
      },
    });

    const res = await getScoutingProgress(req);

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/scouting/progress'),
      expect.objectContaining({
        cache: 'no-store',
        headers: expect.objectContaining({
          'X-Zcout-Anon': 'header-anon-id',
        }),
      }),
    );
  });

  it('progress route falls back to zcout_anon cookie before zcout_anon_id', async () => {
    const req = new Request('http://localhost/api/scouting/progress', {
      headers: {
        cookie: 'zcout_anon=anon-primary; zcout_anon_id=legacy-id',
      },
    });

    await getScoutingProgress(req);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/scouting/progress'),
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Zcout-Anon': 'anon-primary',
        }),
      }),
    );
  });

  it('progress route falls back to zcout_anon_id when zcout_anon is missing', async () => {
    const req = new Request('http://localhost/api/scouting/progress', {
      headers: {
        cookie: 'zcout_anon_id=cookie-anon-id',
      },
    });

    await getScoutingProgress(req);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/scouting/progress'),
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Zcout-Anon': 'cookie-anon-id',
        }),
      }),
    );
  });

  it('progress route forwards auth cookies', async () => {
    const req = new Request('http://localhost/api/scouting/progress', {
      headers: {
        cookie: 'laravel_session=abc123; zcout_anon_id=anon-1',
      },
    });

    await getScoutingProgress(req);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Cookie: 'laravel_session=abc123; zcout_anon_id=anon-1',
        }),
      }),
    );
  });

  it('progress route preserves backend error status and body', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'Missing voter identity.' }), {
        status: 422,
        headers: { 'content-type': 'application/json' },
      }),
    );

    const req = new Request('http://localhost/api/scouting/progress');
    const res = await getScoutingProgress(req);
    const body = await res.json();

    expect(res.status).toBe(422);
    expect(body).toEqual({ message: 'Missing voter identity.' });
  });

  it('dashboard route forwards X-Zcout-Anon', async () => {
    const req = new Request('http://localhost/api/my-scouting', {
      headers: {
        'x-zcout-anon': 'dashboard-anon-id',
      },
    });

    const res = await getMyScouting(req);

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/my-scouting'),
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Zcout-Anon': 'dashboard-anon-id',
        }),
      }),
    );
  });

  it('dashboard route preserves backend error status and body', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'Unauthorized' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      }),
    );

    const req = new Request('http://localhost/api/my-scouting', {
      headers: { 'x-zcout-anon': 'anon' },
    });

    const res = await getMyScouting(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body).toEqual({ message: 'Unauthorized' });
  });
});
