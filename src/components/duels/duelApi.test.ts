import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchDuelPair } from './duelApi'

describe('fetchDuelPair', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    fetchMock.mockReset()
  })

  it('fetches a duel pair, passes request options, and returns a normalized result', async () => {
    const controller = new AbortController()
    const rawPayload = {
      players: [
        { id: 10, name: 'Left Player', position: 'ST' },
        { id: 20, name: 'Right Player', position: 'GK' },
      ],
      attribute: 'dribbling',
      duel_id: 'duel-99',
    }

    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue(rawPayload),
      text: vi.fn(),
    })

    const result = await fetchDuelPair(controller.signal)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith('/api/duels/next', {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })

    expect(result.pair_id).toBe('duel-99')
    expect(result.attribute).toBe('dribbling')
    expect(result.left).toMatchObject({
      id: 10,
      name: 'Left Player',
      avatarSrc: '/players/10.png',
      seedRating: 70,
    })
    expect(result.right).toMatchObject({
      id: 20,
      name: 'Right Player',
      avatarSrc: '/players/20.png',
      seedRating: 70,
    })
    expect(result).not.toEqual(rawPayload)
  })

  it('throws an error that includes HTTP status and response body on failure', async () => {
    const errorBody = 'database connection lost'

    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      text: vi.fn().mockResolvedValue(errorBody),
    })

    await expect(fetchDuelPair(new AbortController().signal)).rejects.toThrow(
      'Pair fetch failed: 500 database connection lost',
    )
  })

  it('truncates long error response bodies to 160 characters in the error message', async () => {
    const longBody = `err-${'x'.repeat(300)}`

    fetchMock.mockResolvedValue({
      ok: false,
      status: 502,
      text: vi.fn().mockResolvedValue(longBody),
    })

    let caught: Error | undefined

    try {
      await fetchDuelPair(new AbortController().signal)
    } catch (error) {
      caught = error as Error
    }

    expect(caught).toBeDefined()
    expect(caught!.message).toContain('502')
    expect(caught!.message).toContain(longBody.slice(0, 160))
    expect(caught!.message).not.toContain(longBody.slice(0, 161))
    expect(caught!.message.length).toBeLessThan(longBody.length)
  })

  it('propagates AbortError without masking it', async () => {
    const controller = new AbortController()
    const abortError = new DOMException('The operation was aborted.', 'AbortError')

    fetchMock.mockRejectedValue(abortError)

    await expect(fetchDuelPair(controller.signal)).rejects.toBe(abortError)
  })

  it('propagates normalization errors for invalid successful responses', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ players: [] }),
      text: vi.fn(),
    })

    await expect(fetchDuelPair(new AbortController().signal)).rejects.toThrow(
      'Brak dwóch graczy w odpowiedzi /api/duels/next',
    )
  })
})
