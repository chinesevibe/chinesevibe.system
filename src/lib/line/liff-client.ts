"use client"

import { t } from "@/lib/i18n/translate"
import {
  coerceLocale,
  DEFAULT_LOCALE,
  isAppLocale,
  LOCALE_COOKIE,
  type AppLocale,
} from "@/lib/i18n/types"
import { INBOUND_SCAN_LIFF_ID } from "@/lib/line/inbound-order-id"

export type LiffContext = {
  ready: boolean
  inClient: boolean
  scanCodeAvailable: boolean
  liffId?: string
  error?: string
  errorCode?: string
}

export type LiffInitDiagnostics = {
  liffId: string
  attempt: number
  errorName?: string
  errorCode?: string
  errorMessage?: string
  stack?: string
  userAgent: string
  isLineWebView: boolean
  online: boolean
  durationMs: number
  url: string
  timestamp: string
}

let lastInitDiagnostics: LiffInitDiagnostics | null = null

/** Latest liff.init() failure details — for UI display and live debugging */
export function getLastLiffInitDiagnostics(): LiffInitDiagnostics | null {
  return lastInitDiagnostics
}

function resolveClientLocale(locale?: AppLocale): AppLocale {
  if (locale) return coerceLocale(locale)
  if (typeof window === "undefined") return DEFAULT_LOCALE

  const urlLang = new URLSearchParams(window.location.search).get("lang")
  if (isAppLocale(urlLang)) return urlLang

  const cookie = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${LOCALE_COOKIE}=`))
    ?.split("=")[1]
  return isAppLocale(cookie) ? cookie : DEFAULT_LOCALE
}

function readLiffErrorCode(err: unknown): string | undefined {
  if (typeof err !== "object" || err === null) return undefined
  const code = (err as { code?: unknown }).code
  return typeof code === "string" && code ? code : undefined
}

function buildDiagnostics(
  liffId: string,
  attempt: number,
  err: unknown,
  durationMs: number
): LiffInitDiagnostics {
  const error = err instanceof Error ? err : undefined
  return {
    liffId,
    attempt,
    errorName: error?.name,
    errorCode: readLiffErrorCode(err),
    errorMessage: error?.message ?? (err == null ? undefined : String(err)),
    stack: error?.stack?.slice(0, 500),
    userAgent: typeof navigator === "undefined" ? "" : navigator.userAgent,
    isLineWebView: isLikelyLineBrowser(),
    online: typeof navigator === "undefined" ? true : navigator.onLine,
    durationMs: Math.round(durationMs),
    url: typeof location === "undefined" ? "" : location.href,
    timestamp: new Date().toISOString(),
  }
}

// Cache only successful inits — a failed init (e.g. network blip during the
// liff.state redirect) must be retryable on the next call.
const initCache = new Map<string, Promise<LiffContext>>()

export function getInboundScanLiffId(): string | undefined {
  return INBOUND_SCAN_LIFF_ID || undefined
}

/** Heuristic when LIFF init fails but user is inside LINE WebView */
export function isLikelyLineBrowser(): boolean {
  if (typeof navigator === "undefined") return false
  return /Line\//i.test(navigator.userAgent)
}

function isFetchLikeError(err: unknown): boolean {
  if (!(err instanceof Error)) return false
  return /failed to fetch|networkerror|load failed|timeout|aborted/i.test(
    err.message
  )
}

function describeLiffInitError(err: unknown, locale?: AppLocale): string {
  const loc = resolveClientLocale(locale)
  if (isFetchLikeError(err)) {
    return t("liff.client.networkError", loc)
  }
  if (err instanceof Error && err.message) {
    return err.message
  }
  return t("liff.client.initFailed", loc)
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function doInit(id: string, locale?: AppLocale): Promise<LiffContext> {
  const liff = (await import("@line/liff")).default

  let lastError: unknown
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const startedAt = performance.now()
    try {
      await liff.init({ liffId: id })
      const inClient = liff.isInClient()
      const scanCodeAvailable = inClient && liff.isApiAvailable("scanCodeV2")
      return {
        ready: true,
        inClient,
        scanCodeAvailable,
        liffId: id,
      }
    } catch (err) {
      lastError = err
      lastInitDiagnostics = buildDiagnostics(
        id,
        attempt + 1,
        err,
        performance.now() - startedAt
      )
      console.error("[liff-init] attempt failed", lastInitDiagnostics)
      // Retry only transient network failures, once, after a short pause
      if (attempt === 0 && isFetchLikeError(err)) {
        await sleep(800)
        continue
      }
      break
    }
  }

  if (lastInitDiagnostics) {
    console.error("[liff-init] FINAL FAILURE", lastInitDiagnostics)
  }

  return {
    ready: false,
    inClient: isLikelyLineBrowser(),
    scanCodeAvailable: false,
    liffId: id,
    error: describeLiffInitError(lastError, locale),
    errorCode: lastInitDiagnostics?.errorCode ?? lastInitDiagnostics?.errorName,
  }
}

export function initLiffClient(
  liffId?: string,
  locale?: AppLocale
): Promise<LiffContext> {
  if (typeof window === "undefined") {
    return Promise.resolve({
      ready: false,
      inClient: false,
      scanCodeAvailable: false,
    })
  }

  const id =
    liffId?.trim() ||
    process.env.NEXT_PUBLIC_LINE_LIFF_ID?.trim() ||
    undefined

  const loc = resolveClientLocale(locale)

  if (!id) {
    return Promise.resolve({
      ready: false,
      inClient: isLikelyLineBrowser(),
      scanCodeAvailable: false,
      error: t("liff.client.missingLiffId", loc),
    })
  }

  const cached = initCache.get(id)
  if (cached) return cached

  const promise = doInit(id, loc).then((ctx) => {
    if (!ctx.ready) {
      // Drop failed result so the next call retries from scratch
      initCache.delete(id)
    }
    return ctx
  })

  initCache.set(id, promise)
  return promise
}

export function initInboundScanLiff(locale?: AppLocale): Promise<LiffContext> {
  const loc = resolveClientLocale(locale)
  const id = getInboundScanLiffId()
  if (!id) {
    return Promise.resolve({
      ready: false,
      inClient: isLikelyLineBrowser(),
      scanCodeAvailable: false,
      error: t("liff.client.missingInboundLiff", loc),
    })
  }
  return initLiffClient(id, loc)
}

export async function scanBarcodeWithLiff(
  liffId?: string,
  locale?: AppLocale
): Promise<string> {
  const loc = resolveClientLocale(locale)
  const id = liffId?.trim() || getInboundScanLiffId()
  if (!id) {
    throw new Error(t("liff.client.notConfigured", loc))
  }

  const liff = (await import("@line/liff")).default
  const ctx = await initLiffClient(id, loc)

  if (!ctx.ready) {
    throw new Error(ctx.error ?? t("liff.client.notReady", loc))
  }

  if (!ctx.inClient) {
    throw new Error(t("liff.client.openInLine", loc))
  }

  if (!liff.isApiAvailable("scanCodeV2")) {
    throw new Error(t("liff.client.scanNotEnabled", loc))
  }

  const result = await liff.scanCodeV2()
  const value = result.value?.trim()
  if (!value) {
    throw new Error(t("liff.client.noBarcode", loc))
  }
  return value
}
