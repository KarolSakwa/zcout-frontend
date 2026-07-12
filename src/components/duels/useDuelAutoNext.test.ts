import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useDuelAutoNext } from './useDuelAutoNext'

const COUNTDOWN_START_AFTER_REVEAL_MS = 450
const AUTO_NEXT_MS = 5000
const COUNTDOWN_TICK_MS = 50

describe('useDuelAutoNext', () => {
  let onComplete: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.useFakeTimers()
    onComplete = vi.fn()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  function scheduleAndStartCountdown(
    result: { current: ReturnType<typeof useDuelAutoNext> },
  ) {
    act(() => {
      result.current.scheduleAfterReveal()
    })

    act(() => {
      vi.advanceTimersByTime(COUNTDOWN_START_AFTER_REVEAL_MS)
    })
  }

  it('keeps progress at 0 until the reveal delay elapses', () => {
    const { result } = renderHook(() => useDuelAutoNext({ onComplete }))

    act(() => {
      result.current.scheduleAfterReveal()
    })

    act(() => {
      vi.advanceTimersByTime(COUNTDOWN_START_AFTER_REVEAL_MS - 1)
    })

    expect(result.current.progress).toBe(0)
    expect(result.current.running).toBe(false)
    expect(onComplete).not.toHaveBeenCalled()
  })

  it('counts down gradually and calls onComplete once when the countdown finishes', () => {
    const { result } = renderHook(() => useDuelAutoNext({ onComplete }))

    scheduleAndStartCountdown(result)

    expect(result.current.running).toBe(true)
    expect(result.current.progress).toBe(0)

    const progressSnapshots: number[] = []

    for (let i = 0; i < 5; i++) {
      act(() => {
        vi.advanceTimersByTime(COUNTDOWN_TICK_MS)
      })
      progressSnapshots.push(result.current.progress)
    }

    expect(progressSnapshots.every((value, index) => index === 0 || value > progressSnapshots[index - 1])).toBe(
      true,
    )
    expect(result.current.progress).toBeGreaterThan(0)
    expect(result.current.progress).toBeLessThan(1)

    act(() => {
      vi.advanceTimersByTime(AUTO_NEXT_MS)
    })

    expect(result.current.progress).toBe(1)
    expect(result.current.running).toBe(false)
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('clear stops timers, resets progress, and does not call onComplete', () => {
    const { result } = renderHook(() => useDuelAutoNext({ onComplete }))

    scheduleAndStartCountdown(result)

    act(() => {
      vi.advanceTimersByTime(COUNTDOWN_TICK_MS * 10)
    })

    expect(result.current.progress).toBeGreaterThan(0)

    act(() => {
      result.current.clear(true)
    })

    expect(result.current.progress).toBe(0)
    expect(result.current.running).toBe(false)
    expect(result.current.paused).toBe(false)

    act(() => {
      vi.advanceTimersByTime(COUNTDOWN_START_AFTER_REVEAL_MS + AUTO_NEXT_MS)
    })

    expect(onComplete).not.toHaveBeenCalled()
  })

  it('pause stops the countdown from advancing', () => {
    const { result } = renderHook(() => useDuelAutoNext({ onComplete }))

    scheduleAndStartCountdown(result)

    act(() => {
      vi.advanceTimersByTime(1000)
    })

    const progressAtPause = result.current.progress
    expect(progressAtPause).toBeGreaterThan(0)

    act(() => {
      result.current.pause()
    })

    expect(result.current.paused).toBe(true)

    act(() => {
      vi.advanceTimersByTime(2000)
    })

    expect(result.current.progress).toBe(progressAtPause)
    expect(onComplete).not.toHaveBeenCalled()
  })

  it('resume continues the countdown from where it was paused', () => {
    const { result } = renderHook(() => useDuelAutoNext({ onComplete }))

    scheduleAndStartCountdown(result)

    act(() => {
      vi.advanceTimersByTime(1000)
    })

    const progressAtPause = result.current.progress

    act(() => {
      result.current.pause()
    })

    act(() => {
      vi.advanceTimersByTime(500)
    })

    act(() => {
      result.current.resume()
    })

    expect(result.current.paused).toBe(false)
    expect(result.current.progress).toBe(progressAtPause)

    act(() => {
      vi.advanceTimersByTime(COUNTDOWN_TICK_MS)
    })

    expect(result.current.progress).toBeGreaterThan(progressAtPause)

    act(() => {
      vi.advanceTimersByTime(AUTO_NEXT_MS)
    })

    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(result.current.progress).toBe(1)
  })

  it('multiple scheduleAfterReveal calls do not run parallel timers', () => {
    const { result } = renderHook(() => useDuelAutoNext({ onComplete }))

    act(() => {
      result.current.scheduleAfterReveal()
      vi.advanceTimersByTime(100)
      result.current.scheduleAfterReveal()
      vi.advanceTimersByTime(100)
      result.current.scheduleAfterReveal()
    })

    act(() => {
      vi.advanceTimersByTime(COUNTDOWN_START_AFTER_REVEAL_MS - 1)
    })

    expect(result.current.progress).toBe(0)
    expect(onComplete).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(1 + AUTO_NEXT_MS)
    })

    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(result.current.progress).toBe(1)
  })
})
