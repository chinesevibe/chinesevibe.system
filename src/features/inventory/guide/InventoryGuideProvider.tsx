"use client"

import { usePathname, useRouter } from "next/navigation"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"

import {
  INVENTORY_GUIDE_STEPS,
  filterGuideSteps,
  type InventoryGuideStep,
} from "@/features/inventory/guide/inventory-guide-steps"

const ENABLED_KEY = "inventory-guide-enabled"
const STEP_KEY = "inventory-guide-step"
const COMPLETED_KEY = "inventory-guide-completed"

type InventoryGuideContextValue = {
  enabled: boolean
  open: boolean
  stepIndex: number
  steps: InventoryGuideStep[]
  step: InventoryGuideStep
  totalSteps: number
  completed: boolean
  setEnabled: (value: boolean) => void
  setOpen: (value: boolean) => void
  goNext: () => void
  goPrev: () => void
  goToStep: (index: number) => void
  restart: () => void
  finish: () => void
}

const InventoryGuideContext = createContext<InventoryGuideContextValue | null>(
  null
)

function readBool(key: string, fallback: boolean): boolean {
  if (typeof window === "undefined") return fallback
  const raw = window.localStorage.getItem(key)
  if (raw === "true") return true
  if (raw === "false") return false
  return fallback
}

function readStep(key: string): number {
  if (typeof window === "undefined") return 0
  const raw = window.localStorage.getItem(key)
  const n = raw ? Number.parseInt(raw, 10) : 0
  return Number.isFinite(n) && n >= 0 ? n : 0
}

export function InventoryGuideProvider({
  staffMode,
  showMasterData,
  children,
}: {
  staffMode: boolean
  showMasterData: boolean
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()

  const steps = useMemo(
    () =>
      filterGuideSteps(INVENTORY_GUIDE_STEPS, { staffMode, showMasterData }),
    [staffMode, showMasterData]
  )

  const [enabled, setEnabledState] = useState(true)
  const [open, setOpen] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [completed, setCompleted] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  const persistStep = useCallback((index: number) => {
    setStepIndex(index)
    window.localStorage.setItem(STEP_KEY, String(index))
  }, [])

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const storedEnabled = readBool(ENABLED_KEY, true)
      const storedCompleted = readBool(COMPLETED_KEY, false)
      const storedStep = readStep(STEP_KEY)

      setEnabledState(storedEnabled)
      setCompleted(storedCompleted)
      setStepIndex(Math.min(storedStep, steps.length - 1))
      setOpen(storedEnabled && !storedCompleted)
      setHydrated(true)
    })

    return () => window.cancelAnimationFrame(frame)
  }, [steps.length])

  const setEnabled = useCallback((value: boolean) => {
    setEnabledState(value)
    window.localStorage.setItem(ENABLED_KEY, String(value))
    if (value) {
      setOpen(true)
    } else {
      setOpen(false)
    }
  }, [])

  const navigateToStep = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(index, steps.length - 1))
      persistStep(clamped)
      const target = steps[clamped]
      if (target && pathname !== target.href && !pathname.startsWith(`${target.href}/`)) {
        router.push(target.href)
      }
    },
    [pathname, persistStep, router, steps]
  )

  const goNext = useCallback(() => {
    setStepIndex((current) => {
      if (current >= steps.length - 1) {
        setCompleted(true)
        window.localStorage.setItem(COMPLETED_KEY, "true")
        setOpen(false)
        return current
      }
      const next = current + 1
      window.localStorage.setItem(STEP_KEY, String(next))
      const target = steps[next]
      if (
        target &&
        pathname !== target.href &&
        !pathname.startsWith(`${target.href}/`)
      ) {
        router.push(target.href)
      }
      return next
    })
  }, [pathname, router, steps])

  const goPrev = useCallback(() => {
    navigateToStep(stepIndex - 1)
  }, [navigateToStep, stepIndex])

  const goToStep = useCallback(
    (index: number) => {
      navigateToStep(index)
    },
    [navigateToStep]
  )

  const restart = useCallback(() => {
    window.localStorage.setItem(COMPLETED_KEY, "false")
    setCompleted(false)
    setEnabledState(true)
    window.localStorage.setItem(ENABLED_KEY, "true")
    setOpen(true)
    navigateToStep(0)
  }, [navigateToStep])

  const finish = useCallback(() => {
    setCompleted(true)
    window.localStorage.setItem(COMPLETED_KEY, "true")
    setOpen(false)
  }, [])

  const step = steps[stepIndex] ?? steps[0]

  const value = useMemo<InventoryGuideContextValue>(
    () => ({
      enabled,
      open: hydrated && enabled && open,
      stepIndex,
      steps,
      step,
      totalSteps: steps.length,
      completed,
      setEnabled,
      setOpen,
      goNext,
      goPrev,
      goToStep,
      restart,
      finish,
    }),
    [
      completed,
      enabled,
      finish,
      goNext,
      goPrev,
      goToStep,
      hydrated,
      open,
      restart,
      setEnabled,
      step,
      stepIndex,
      steps,
    ]
  )

  return (
    <InventoryGuideContext.Provider value={value}>
      {children}
    </InventoryGuideContext.Provider>
  )
}

export function useInventoryGuide() {
  const ctx = useContext(InventoryGuideContext)
  if (!ctx) {
    throw new Error("useInventoryGuide must be used within InventoryGuideProvider")
  }
  return ctx
}
