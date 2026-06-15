"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { useLocale } from "@/features/portal/LocaleProvider"
import type { MessageKey } from "@/lib/i18n/translate"

const inputClassName =
  "h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm"

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

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { workDate: "", startTime: "18:00", endTime: "20:00", reason: "" },
  })
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch("/api/overtime/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(formatOvertimeApiError(body))
      }
      setSuccess(true)
      form.reset()
    } catch (e) {
      setError(e instanceof Error ? e.message : tx("ot.form.submitFailed"))
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return <p className="text-sm text-green-700">{tx("ot.form.success")}</p>
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <FormField
          control={form.control}
          name="workDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{tx("ot.form.workDate")}</FormLabel>
              <FormControl>
                <input type="date" className={inputClassName} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="startTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{tx("ot.form.startTime")}</FormLabel>
                <FormControl>
                  <input type="time" className={inputClassName} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="endTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{tx("ot.form.endTime")}</FormLabel>
                <FormControl>
                  <input type="time" className={inputClassName} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="reason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{tx("ot.form.reason")}</FormLabel>
              <FormControl>
                <textarea
                  className="min-h-[80px] w-full rounded-lg border border-input px-3 py-2 text-sm"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" disabled={submitting}>
          {submitting ? tx("liff.common.submitting") : tx("ot.form.submit")}
        </Button>
      </form>
    </Form>
  )
}
