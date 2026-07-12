import { describe, expect, it } from 'vitest'
import { normalizePair } from './duelUtils'

function minimalPlayersPayload() {
  return {
    players: [
      { id: 10, name: 'Alice', position: 'ST' },
      { id: 20, name: 'Bob', position: 'GK' },
    ],
    attribute: 'Dribbling',
    duel_id: 42,
  }
}

describe('normalizePair', () => {
  it('maps a two-player backend payload into a PairResponse', () => {
    const payload = minimalPlayersPayload()

    const result = normalizePair(payload)

    expect(result.pair_id).toBe('42')
    expect(result.attribute).toBe('dribbling')
    expect(result.left).toEqual({
      id: 10,
      name: 'Alice',
      position: 'ST',
      nation: null,
      countryIso2: null,
      seedRating: 70,
      avatarSrc: '/players/10.png',
      club: null,
      color: '#1f2937',
      secondaryColor: '#111827',
      number: undefined,
    })
    expect(result.right).toEqual({
      id: 20,
      name: 'Bob',
      position: 'GK',
      nation: null,
      countryIso2: null,
      seedRating: 70,
      avatarSrc: '/players/20.png',
      club: null,
      color: '#1f2937',
      secondaryColor: '#111827',
      number: undefined,
    })
  })

  it('assigns the first player to left and the second player to right', () => {
    const payload = {
      players: [
        { id: 1, name: 'First', position: 'LW' },
        { id: 2, name: 'Second', position: 'RW' },
      ],
      attribute: 'pace',
      duel_id: 'pair-1',
    }

    const result = normalizePair(payload)

    expect(result.left.name).toBe('First')
    expect(result.left.id).toBe(1)
    expect(result.right.name).toBe('Second')
    expect(result.right.id).toBe(2)
  })

  it('throws when only one player is provided', () => {
    const payload = {
      players: [{ id: 1, name: 'Solo', position: 'ST' }],
      attribute: 'shooting',
    }

    expect(() => normalizePair(payload)).toThrow(
      'Brak dwóch graczy w odpowiedzi /api/duels/next',
    )
  })

  it('throws when players is an empty array', () => {
    const payload = {
      players: [],
      attribute: 'passing',
    }

    expect(() => normalizePair(payload)).toThrow(
      'Brak dwóch graczy w odpowiedzi /api/duels/next',
    )
  })

  it('throws when players field is missing', () => {
    const payload = {
      attribute: 'defending',
      duel_id: 7,
    }

    expect(() => normalizePair(payload)).toThrow(
      'Brak dwóch graczy w odpowiedzi /api/duels/next',
    )
  })

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['string', 'not-an-object'],
    ['number', 123],
  ])('throws for invalid payload type: %s', (_label, payload) => {
    expect(() => normalizePair(payload)).toThrow('Invalid duel response')
  })

  it('does not mutate the input payload', () => {
    const payload = minimalPlayersPayload()
    const snapshot = structuredClone(payload)

    normalizePair(payload)

    expect(payload).toEqual(snapshot)
  })

  it('returns a new object graph instead of reusing mapped input references', () => {
    const leftPlayer = { id: 10, name: 'Alice', position: 'ST' }
    const rightPlayer = { id: 20, name: 'Bob', position: 'GK' }
    const payload = {
      players: [leftPlayer, rightPlayer],
      attribute: 'dribbling',
      duel_id: 42,
    }

    const result = normalizePair(payload)

    expect(result).not.toBe(payload)
    expect(result.left).not.toBe(leftPlayer)
    expect(result.right).not.toBe(rightPlayer)
  })

  describe('pre-shaped payload with left, right and attribute', () => {
    it('accepts the payload and returns its fields without mapping', () => {
      const left = { id: 1, name: 'Left', position: 'ST', seedRating: 80 }
      const right = { id: 2, name: 'Right', position: 'GK', seedRating: 75 }
      const payload = {
        pair_id: 'pair-99',
        attribute: 'dribbling',
        left,
        right,
      }

      const result = normalizePair(payload)

      expect(result.pair_id).toBe('pair-99')
      expect(result.attribute).toBe('dribbling')
      expect(result.left).toEqual(left)
      expect(result.right).toEqual(right)
    })

    it('returns the same object references as the input payload', () => {
      const left = { id: 1, name: 'Left', position: 'ST' }
      const right = { id: 2, name: 'Right', position: 'GK' }
      const payload = {
        pair_id: 'pair-99',
        attribute: 'dribbling',
        left,
        right,
      }

      const result = normalizePair(payload)

      expect(result).toBe(payload)
      expect(result.left).toBe(left)
      expect(result.right).toBe(right)
    })

    it('does not validate missing or incomplete player fields on the fast path', () => {
      const left = {}
      const right = { name: 'Only name' }
      const payload = {
        attribute: 'pace',
        left,
        right,
      }

      const result = normalizePair(payload)

      expect(result.left).toBe(left)
      expect(result.right).toBe(right)
      expect(result.left).toEqual({})
      expect(result.right).toEqual({ name: 'Only name' })
    })

    it('does not validate invalid player entries when they are still objects', () => {
      const left = null as unknown as Record<string, unknown>
      const payloadWithNullLeft = {
        attribute: 'shooting',
        left,
        right: { id: 2, name: 'Right' },
      }

      expect(() => normalizePair(payloadWithNullLeft)).toThrow(
        'Brak dwóch graczy w odpowiedzi /api/duels/next',
      )

      const payloadWithObjectAttribute = {
        attribute: { key: 'defending', label: 'Defending' },
        left: { id: 1, name: 'Left' },
        right: { id: 2, name: 'Right' },
      }

      expect(() => normalizePair(payloadWithObjectAttribute)).toThrow(
        'Brak dwóch graczy w odpowiedzi /api/duels/next',
      )
    })
  })
})
