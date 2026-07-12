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
      'Expected two players in the /api/duels/next response',
    )
  })

  it('throws when players is an empty array', () => {
    const payload = {
      players: [],
      attribute: 'passing',
    }

    expect(() => normalizePair(payload)).toThrow(
      'Expected two players in the /api/duels/next response',
    )
  })

  it('throws when players field is missing', () => {
    const payload = {
      attribute: 'defending',
      duel_id: 7,
    }

    expect(() => normalizePair(payload)).toThrow(
      'Expected two players in the /api/duels/next response',
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
    it('normalizes a pre-shaped payload into the same PairResponse shape as players[]', () => {
      const left = { id: 1, name: 'Left', position: 'ST', seedRating: 80 }
      const right = { id: 2, name: 'Right', position: 'GK', seedRating: 75 }
      const payload = {
        pair_id: 'pair-99',
        attribute: 'Dribbling',
        left,
        right,
      }

      const result = normalizePair(payload)

      expect(result.pair_id).toBe('pair-99')
      expect(result.attribute).toBe('dribbling')
      expect(result.left).toEqual({
        id: 1,
        name: 'Left',
        position: 'ST',
        nation: null,
        countryIso2: null,
        seedRating: 70,
        avatarSrc: '/players/1.png',
        club: null,
        color: '#1f2937',
        secondaryColor: '#111827',
        number: undefined,
      })
      expect(result.right).toEqual({
        id: 2,
        name: 'Right',
        position: 'GK',
        nation: null,
        countryIso2: null,
        seedRating: 70,
        avatarSrc: '/players/2.png',
        club: null,
        color: '#1f2937',
        secondaryColor: '#111827',
        number: undefined,
      })
    })

    it('returns a new object graph instead of reusing the input references', () => {
      const left = { id: 1, name: 'Left', position: 'ST' }
      const right = { id: 2, name: 'Right', position: 'GK' }
      const payload = {
        pair_id: 'pair-99',
        attribute: 'dribbling',
        left,
        right,
      }

      const result = normalizePair(payload)

      expect(result).not.toBe(payload)
      expect(result.left).not.toBe(left)
      expect(result.right).not.toBe(right)
    })

    it('normalizes object-shaped attribute values on the pre-shaped path', () => {
      const payload = {
        pair_id: 'pair-100',
        attribute: { key: 'Defending', label: 'Defending' },
        left: { id: 1, name: 'Left', position: 'CB' },
        right: { id: 2, name: 'Right', position: 'LB' },
      }

      const result = normalizePair(payload)

      expect(result.attribute).toBe('defending')
      expect(result.attributeLabel).toBe('Defending')
    })

    it('fills default player fields for incomplete left and right objects', () => {
      const left = {}
      const right = { name: 'Only name' }
      const payload = {
        attribute: 'pace',
        left,
        right,
      }

      const result = normalizePair(payload)

      expect(result.left).toEqual({
        id: 0,
        name: '',
        position: 'ST',
        nation: null,
        countryIso2: null,
        seedRating: 70,
        avatarSrc: '/players/0.png',
        club: null,
        color: '#1f2937',
        secondaryColor: '#111827',
        number: undefined,
      })
      expect(result.right).toEqual({
        id: 0,
        name: 'Only name',
        position: 'ST',
        nation: null,
        countryIso2: null,
        seedRating: 70,
        avatarSrc: '/players/0.png',
        club: null,
        color: '#1f2937',
        secondaryColor: '#111827',
        number: undefined,
      })
      expect(result.left).not.toBe(left)
      expect(result.right).not.toBe(right)
    })

    it('rejects evidently invalid pre-shaped payloads that cannot be normalized', () => {
      const payloadWithNullLeft = {
        attribute: 'shooting',
        left: null,
        right: { id: 2, name: 'Right' },
      }

      expect(() => normalizePair(payloadWithNullLeft)).toThrow(
        'Expected two players in the /api/duels/next response',
      )

      const payloadWithInvalidPlayer = {
        attribute: 'shooting',
        left: { id: 1, name: 'Left' },
        right: null,
      }

      expect(() => normalizePair(payloadWithInvalidPlayer)).toThrow(
        'Expected two players in the /api/duels/next response',
      )
    })
  })
})
