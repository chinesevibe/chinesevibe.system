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

export function ComplaintForm() {
  const { tx } = useLocale()

  const schema = useMemo(
    () =>
      z.object({
        subject: z.string().trim().min(3, tx("complaint.form.validation.subject")),
        body: z.string().trim().min(10, tx("complaint.form.validation.body")),
        isAnonymous: z.boolean(),
      }),
    [tx]
  )

  type FormValues = z.infer<typeof schema>

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { subject: "", body: "", isAnonymous: false },
  })
  const [submitting, setSubmitting] = useState(false)
  const [ticketCode, setTicketCode] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(values: FormValues) {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch("/api/complaints/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(body?.error ?? tx("complaint.form.submitFailed"))
      }
      const data = (await res.json()) as { ticketCode: string }
      setTicketCode(data.ticketCode)
      form.reset()
    } catch (e) {
      setError(e instanceof Error ? e.message : tx("complaint.form.submitFailed"))
    } finally {
      setSubmitting(false)
    }
  }

  if (ticketCode) {
    return (
      <p className="text-sm text-green-700">
        {tx("complaint.form.success", { ticketCode })}
      </p>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <FormField
          control={form.control}
          name="subject"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{tx("complaint.form.subjectLabel")}</FormLabel>
              <FormControl>
                <input
                  className="h-9 w-full rounded-lg border border-input px-3 text-sm"
                  placeholder={tx("complaint.form.subjectPlaceholder")}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="body"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{tx("complaint.form.bodyLabel")}</FormLabel>
              <FormControl>
                <textarea
                  className="min-h-[100px] w-full rounded-lg border border-input px-3 py-2 text-sm"
                  placeholder={tx("complaint.form.bodyPlaceholder")}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="isAnonymous"
          render={({ field }) => (
            <FormItem className="flex items-center gap-2">
              <FormControl>
                <input
                  type="checkbox"
                  checked={field.value}
                  onChange={field.onChange}
                />
              </FormControl>
              <FormLabel className="!mt-0">{tx("complaint.form.anonymousLabel")}</FormLabel>
            </FormItem>
          )}
        />
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" disabled={submitting}>
          {submitting ? tx("liff.common.submitting") : tx("complaint.form.submit")}
        </Button>
      </form>
    </Form>
  )
}
