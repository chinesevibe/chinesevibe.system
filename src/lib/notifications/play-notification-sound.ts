/** Short notification tone via Web Audio API (no asset file). */
export function playNotificationSound(): void {
  if (typeof window === "undefined") return
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = "sine"
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.08)
    gain.gain.setValueAtTime(0.0001, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.26)
    osc.onended = () => void ctx.close()
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
