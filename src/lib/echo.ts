'use client'

import Echo from 'laravel-echo'
import Pusher from 'pusher-js'

declare global {
  interface Window {
    Pusher?: typeof Pusher
    Echo?: Echo<'pusher'>
  }
}

let echoInstance: Echo<'pusher'> | null = null

export function initEcho(): Echo<'pusher'> | null {
  if (typeof window === 'undefined') {
    return null
  }

  if (window.Echo) {
    return window.Echo
  }

  window.Pusher = Pusher

  const isHttps = window.location.protocol === 'https:'

  echoInstance = new Echo<'pusher'>({
    broadcaster: 'pusher',
    key: process.env.NEXT_PUBLIC_PUSHER_APP_KEY!,
    wsHost: process.env.NEXT_PUBLIC_PUSHER_HOST!,
    wsPort: 80,
    wssPort: 443,
    forceTLS: isHttps,
    enabledTransports: ['ws', 'wss'],
    cluster: process.env.NEXT_PUBLIC_PUSHER_APP_CLUSTER!,
  })

  window.Echo = echoInstance

  return echoInstance
}