'use client'

import Echo from 'laravel-echo'
import Pusher from 'pusher-js'

declare global {
  interface Window {
    Pusher?: typeof Pusher
    Echo?: Echo
  }
}

let echoInstance: Echo | null = null

export function initEcho(): Echo | null {
  if (typeof window === 'undefined') {
    return null
  }

  if (window.Echo) {
    return window.Echo
  }

  window.Pusher = Pusher

  echoInstance = new Echo({
    broadcaster: 'pusher',
    key: process.env.NEXT_PUBLIC_PUSHER_APP_KEY || 'zcout-key',
    wsHost: process.env.NEXT_PUBLIC_PUSHER_HOST || 'localhost',
    wsPort: Number(process.env.NEXT_PUBLIC_PUSHER_PORT || 6001),
    wssPort: Number(process.env.NEXT_PUBLIC_PUSHER_PORT || 6001),
    forceTLS: false,
    enabledTransports: ['ws', 'wss'],
    cluster: process.env.NEXT_PUBLIC_PUSHER_APP_CLUSTER || 'mt1',
  })

  window.Echo = echoInstance

  return echoInstance
}