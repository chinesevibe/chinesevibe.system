"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { useLocale } from "@/features/portal/LocaleProvider"
import type { MessageKey } from "@/lib/i18n/translate"

type OtType = "normal" | "holiday_weekly" | "holiday_public"

const OT_TYPES: { value: OtType; label: string; multiplier: number }[] = [
  { value: "normal", label: "วันทำงานปกติ", multiplier: 1.5 },
  { value: "holiday_weekly", label: "วันหยุดประจำสัปดาห์", multiplier: 2 },
  { value: "holiday_public", label: "วันหยุดนักขัตฤกษ์", multiplier: 3 },
]

const inputCls =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#E80012] focus:outline-none"

function calcHours(start: string, end: string): number | null {
  if (!start || !end) return null
  const [sh, sm] = start.split(":").map(Number)
  const [eh, em] = end.split(":").map(Number)
  const diff = (eh * 60 + em) - (sh * 60 + sm)
  return diff > 0 ? Math.round(diff / 60 * 10) / 10 : null
}

export function OvertimeForm() {
  const { tx } = useLocale()

  const schema = useMemo(
    () =>
      z
        .object({
          workDate: z.string().min(1, tx("ot.form.validation.workDate")),
          startTime: z.string().min(1, tx("ot.form.validation.startTime")),
          endTime: z.string().min(1, tx("ot.form.validation.endTime")),
          reason: z.string().trim().min(5, tx("ot.form.validation.reason")),
        })
        .refine((v) => v.endTime > v.startTime, {
          path: ["endTime"],
          message: tx("ot.form.validation.endAfterStart"),
        }),
    [tx]
  )

  type FormValues = z.infer<typeof schema>

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { workDate: "", startTime: "18:00", endTime: "20:00", reason: "" },
  })

  const [otType, setOtType] = useState<OtType>("normal")
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const startTime = watch("startTime")
  const endTime = watch("endTime")
  const otHours = calcHours(startTime, endTime)
  const currentOt = OT_TYPES.find((o) => o.value === otType)!

  function formatOvertimeApiError(body: { error?: string } | null): string {
    const code = body?.error
    if (!code) return tx("ot.form.submitFailed")
    const keyMap: Record<string, MessageKey> = {
      forbidden: "ot.form.error.forbidden",
      unauthorized: "ot.form.error.unauthorized",
      invalid_fields: "ot.form.error.invalidFields",
    }
    const key = keyMap[code]
    return key ? tx(key) : code
  }

  async function onSubmit(values: FormValues) {
    setSubmitting(true); setError(null)
    try {
      const res = await fetch("/api/overtime/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...values, overtimeType: otType }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(formatOvertimeApiError(body))
      }
      setSuccess(true); reset()
    } catch (e) {
      setError(e instanceof Error ? e.message : tx("ot.form.submitFailed"))
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="rounded-xl border border-green-100 bg-green-50 p-5 text-center">
        <p className="text-2xl">✅</p>
        <p className="mt-2 font-medium text-green-700">{tx("ot.form.success")}</p>
        <button onClick={() => setSuccess(false)} className="mt-3 text-sm text-gray-400 underline">
          ยื่นคำขอใหม่
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>

      {/* ── OT type pills ── */}
      <div>
        <p className="mb-2 text-sm font-medium text-gray-700">ประเภท OT</p>
        <div className="flex flex-col gap-2">
          {OT_TYPES.map((ot) => (
            <button
              key={ot.value}
              type="button"
              onClick={() => setOtType(ot.value)}
              className={`flex items-center justify-between rounded-xl border px-4 py-2.5 text-sm transition-colors ${
                otType === ot.value
                  ? "border-[#E80012] bg-red-50 text-[#E80012]"
                  : "border-gray-200 bg-white text-gray-600"
              }`}
            >
              <span className="font-medium">{ot.label}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                otType === ot.value ? "bg-[#E80012] text-white" : "bg-gray-100 text-gray-500"
              }`}>
                ×{ot.multiplier}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Warning box ── */}
      <div className="flex gap-2 rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
        <span className="mt-0.5 shrink-0">⚠️</span>
        <p>OT ต้องได้รับอนุมัติจากผู้บังคับบัญชาล่วงหน้า — คำขอที่ส่งหลังทำงานแล้วอาจไม่ได้รับการอนุมัติ</p>
      </div>

      {/* ── Work date ── */}
      <div>
        <p className="mb-1.5 text-sm font-medium text-gray-700">{tx("ot.form.workDate")}</p>
        <input type="date" {...register("workDate")} className={inputCls} />
        {errors.workDate && <p className="mt-1 text-xs text-[#E80012]">{errors.workDate.message}</p>}
      </div>

      {/* ── Time range ── */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="mb-1.5 text-sm font-medium text-gray-700">{tx("ot.form.startTime")}</p>
          <input type="time" {...register("startTime")} className={inputCls} />
          {errors.startTime && <p className="mt-1 text-xs text-[#E80012]">{errors.startTime.message}</p>}
        </div>
        <div>
          <p className="mb-1.5 text-sm font-medium text-gray-700">{tx("ot.form.endTime")}</p>
          <input type="time" {...register("endTime")} className={inputCls} />
          {errors.endTime && <p className="mt-1 text-xs text-[#E80012]">{errors.endTime.message}</p>}
        </div>
      </div>

      {/* ── Cost estimate ── */}
      {otHours !== null && (
        <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
          <div className="flex-1">
            <p className="text-xs text-gray-400">ประมาณการ OT</p>
            <p className="mt-0.5 text-sm font-semibold text-gray-800">
              {otHours} ชั่วโมง × <span className="text-[#E80012]">×{currentOt.multiplier}</span>
            </p>
          </div>
          <div className="rounded-full bg-[#F5F5F5] px-3 py-1 text-xs font-medium text-gray-600">
            {currentOt.label}
          </div>
        </div>
      )}

      {/* ── Reason ── */}
      <div>
        <p className="mb-1.5 text-sm font-medium text-gray-700">{tx("ot.form.reason")}</p>
        <textarea
          {...register("reason")}
          rows={3}
          placeholder="กรุณาระบุเหตุผลในการทำ OT..."
          className={`${inputCls} resize-none py-2`}
        />
        {errors.reason && <p className="mt-1 text-xs text-[#E80012]">{errors.reason.message}</p>}
      </div>

      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-[#E80012]">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-xl bg-[#E80012] py-3.5 text-sm font-semibold text-white disabled:opacity-50 active:opacity-80"
      >
        {submitting ? tx("liff.common.submitting") : tx("ot.form.submit")}
      </button>
    </form>
  )
}
