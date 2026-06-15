"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { useLocale } from "@/features/portal/LocaleProvider"
import { formatLeaveApiError } from "@/features/leave/balance"
import { countLeaveDays, LEAVE_TYPES, type LeaveType } from "@/features/leave/types"
import type { MessageKey } from "@/lib/i18n/messages"
import { cn } from "@/lib/utils"

const MAX_FILE_BYTES = 5 * 1024 * 1024
const ALLOWED_FILE_TYPES = ["image/jpeg", "image/png", "application/pdf"]

function leaveTypeKey(type: LeaveType): MessageKey {
  return `leave.type.${type}` as MessageKey
}

function leaveAdvanceKey(type: LeaveType): MessageKey {
  return `leave.advance.${type}` as MessageKey
}

const inputClassName =
  "h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive"

export function LeaveForm() {
  const { tx } = useLocale()

  const leaveFormSchema = useMemo(
    () =>
      z
        .object({
          type: z.enum(LEAVE_TYPES, tx("leave.form.validation.type")),
          startDate: z.string().min(1, tx("leave.form.validation.startDate")),
          endDate: z.string().min(1, tx("leave.form.validation.endDate")),
          reason: z.string().trim().min(5, tx("leave.form.validation.reason")),
        })
        .refine((v) => countLeaveDays(v.startDate, v.endDate) !== null, {
          path: ["endDate"],
          message: tx("leave.form.validation.endBeforeStart"),
        }),
    [tx]
  )

  type LeaveFormValues = z.infer<typeof leaveFormSchema>

  const form = useForm<LeaveFormValues>({
    resolver: zodResolver(leaveFormSchema),
    mode: "onTouched",
    defaultValues: { type: "sick", startDate: "", endDate: "", reason: "" },
  })

  const [file, setFile] = useState<File | null>(null)
  const [leaveHours, setLeaveHours] = useState("")
  const [fileError, setFileError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const type = form.watch("type")
  const startDate = form.watch("startDate")
  const endDate = form.watch("endDate")
  const days = countLeaveDays(startDate, endDate)
  const isSameDaySick = type === "sick" && startDate && endDate && startDate === endDate

  function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null
    if (!selected) {
      setFile(null)
      setFileError(null)
      return
    }
    if (!ALLOWED_FILE_TYPES.includes(selected.type)) {
      setFile(null)
      setFileError(tx("leave.form.validation.fileType"))
      return
    }
    if (selected.size > MAX_FILE_BYTES) {
      setFile(null)
      setFileError(tx("leave.form.validation.fileSize"))
      return
    }
    setFile(selected)
    setFileError(null)
  }

  async function onSubmit(values: LeaveFormValues) {
    setSubmitting(true)
    setSubmitError(null)
    setSuccess(false)

    const formData = new FormData()
    formData.append("type", values.type)
    formData.append("startDate", values.startDate)
    formData.append("endDate", values.endDate)
    formData.append("reason", values.reason)
    if (file) formData.append("attachment", file)
    if (type === "sick" && leaveHours.trim()) {
      formData.append("leaveHours", leaveHours.trim())
    }

    try {
      const res = await fetch("/api/leave/request", {
        method: "POST",
        body: formData,
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string
          message?: string
        } | null
        throw new Error(formatLeaveApiError(body))
      }
      setSuccess(true)
      form.reset({ type: "sick", startDate: "", endDate: "", reason: "" })
      setFile(null)
    } catch (e) {
      setSubmitError(
        e instanceof Error ? e.message : tx("leave.form.submitFailed")
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
        noValidate
      >
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{tx("leave.form.typeLabel")}</FormLabel>
              <FormControl>
                <select {...field} className={cn(inputClassName, "bg-card")}>
                  {LEAVE_TYPES.filter((value) => value !== "other").map((value) => (
                    <option key={value} value={value}>
                      {tx(leaveTypeKey(value))}
                    </option>
                  ))}
                </select>
              </FormControl>
              <FormDescription>{tx(leaveAdvanceKey(type))}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{tx("leave.form.startDate")}</FormLabel>
                <FormControl>
                  <input type="date" {...field} className={inputClassName} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{tx("leave.form.endDate")}</FormLabel>
                <FormControl>
                  <input type="date" {...field} className={inputClassName} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {isSameDaySick ? (
          <FormItem>
            <FormLabel>{tx("leave.form.sickHoursLabel")}</FormLabel>
            <FormControl>
              <input
                type="number"
                min={0.5}
                max={24}
                step={0.5}
                value={leaveHours}
                onChange={(e) => setLeaveHours(e.target.value)}
                className={inputClassName}
                placeholder={tx("leave.form.sickHoursPlaceholder")}
              />
            </FormControl>
            <FormDescription>{tx("leave.form.sickHoursDesc")}</FormDescription>
          </FormItem>
        ) : (
          <p className="text-sm text-muted-foreground">
            {tx("leave.form.daysCount")}{" "}
            <span className="font-medium text-foreground tabular-nums">
              {days === null
                ? "—"
                : tx("leave.form.daysValue", { count: days })}
            </span>
            {type === "sick" ? (
              <span className="block text-xs">{tx("leave.form.sickRetroNote")}</span>
            ) : null}
          </p>
        )}

        <FormField
          control={form.control}
          name="reason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{tx("leave.form.reasonLabel")}</FormLabel>
              <FormControl>
                <textarea
                  {...field}
                  rows={3}
                  placeholder={tx("leave.form.reasonPlaceholder")}
                  className={cn(inputClassName, "h-auto py-2")}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {type === "sick" ? (
          <FormItem>
            <FormLabel>{tx("leave.form.attachmentLabel")}</FormLabel>
            <FormControl>
              <input
                type="file"
                accept="image/jpeg,image/png,application/pdf"
                onChange={onFileChange}
                aria-invalid={!!fileError}
                className={cn(inputClassName, "h-auto py-1.5 file:mr-3")}
              />
            </FormControl>
            {fileError ? (
              <p className="text-sm text-destructive">{fileError}</p>
            ) : file ? (
              <FormDescription>
                {tx("leave.form.fileSelected", { name: file.name })}
              </FormDescription>
            ) : null}
          </FormItem>
        ) : null}

        <div className="flex items-center gap-2 border-t pt-4">
          <Button type="submit" disabled={submitting}>
            {submitting ? tx("liff.common.submitting") : tx("leave.form.submit")}
          </Button>
        </div>

        {success ? (
          <p className="text-sm text-green-600">{tx("leave.form.success")}</p>
        ) : null}
        {submitError ? (
          <p className="text-sm text-destructive">{submitError}</p>
        ) : null}
      </form>
    </Form>
  )
}
