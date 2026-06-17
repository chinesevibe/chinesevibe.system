/** Peak output gain for the admin notification tone (0–1, Web Audio max). */
const NOTIFICATION_SOUND_VOLUME = 1

function playTone(
  ctx: AudioContext,
  startAt: number,
  frequency: number,
  durationSec: number,
  volume = NOTIFICATION_SOUND_VOLUME
): void {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = "triangle"
  osc.frequency.setValueAtTime(frequency, startAt)
  gain.gain.setValueAtTime(0.0001, startAt)
  gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.015)
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + durationSec)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(startAt)
  osc.stop(startAt + durationSec + 0.02)
}

/** Short notification tone via Web Audio API (no asset file). */
export function playNotificationSound(): void {
  if (typeof window === "undefined") return
  try {
    const ctx = new AudioContext()
    const start = ctx.currentTime
    playTone(ctx, start, 880, 0.14)
    playTone(ctx, start + 0.16, 1175, 0.18)
    window.setTimeout(() => void ctx.close(), 450)
  } catch {
    // Autoplay policy or unsupported — ignore
  }
}

const MUTE_KEY = "admin-notification-sound-muted"

export function isNotificationSoundMuted(): boolean {
  if (typeof window === "undefined") return false
  return window.localStorage.getItem(MUTE_KEY) === "1"
}

export function setNotificationSoundMuted(muted: boolean): void {
  if (typeof window === "undefined") return
  window.localStorage.setItem(MUTE_KEY, muted ? "1" : "0")
}
