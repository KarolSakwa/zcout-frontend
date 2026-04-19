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

  echoInstance = new Echo<'pusher'>({
    broadcaster: 'pusher',
    key: process.env.NEXT_PUBLIC_PUSHER_APP_KEY!,
    wsHost: process.env.NEXT_PUBLIC_PUSHER_HOST!,
    wsPort: Number(process.env.NEXT_PUBLIC_PUSHER_PORT!),
    wssPort: Number(process.env.NEXT_PUBLIC_PUSHER_PORT!),
    forceTLS: false,
    enabledTransports: ['ws'],
    cluster: process.env.NEXT_PUBLIC_PUSHER_APP_CLUSTER!,
  })

  window.Echo = echoInstance

  return echoInstance
}