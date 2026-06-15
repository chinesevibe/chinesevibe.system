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
import { DOC_TYPES, type DocType } from "@/features/documents/types"

const DOC_TYPE_KEYS: Record<
  DocType,
  "doc.type.employment_cert" | "doc.type.salary_cert" | "doc.type.tax_cert" | "doc.type.other"
> = {
  employment_cert: "doc.type.employment_cert",
  salary_cert: "doc.type.salary_cert",
  tax_cert: "doc.type.tax_cert",
  other: "doc.type.other",
}

const inputClassName =
  "h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

export function DocumentRequestForm() {
  const { tx } = useLocale()

  const schema = useMemo(
    () =>
      z.object({
        docType: z.enum(DOC_TYPES, tx("doc.form.validation.type")),
        copies: z.number().min(1).max(10),
        purpose: z.string().trim().min(5, tx("doc.form.validation.purpose")),
      }),
    [tx]
  )

  type FormValues = z.infer<typeof schema>

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { docType: "employment_cert", copies: 1, purpose: "" },
  })
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(values: FormValues) {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch("/api/documents/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(body?.error ?? tx("doc.form.submitFailed"))
      }
      setSuccess(true)
      form.reset()
    } catch (e) {
      setError(e instanceof Error ? e.message : tx("doc.form.submitFailed"))
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return <p className="text-sm text-green-700">{tx("doc.form.success")}</p>
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <FormField
          control={form.control}
          name="docType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{tx("doc.form.typeLabel")}</FormLabel>
              <FormControl>
                <select className={inputClassName} {...field}>
                  {DOC_TYPES.map((docType) => (
                    <option key={docType} value={docType}>
                      {tx(DOC_TYPE_KEYS[docType])}
                    </option>
                  ))}
                </select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="copies"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{tx("doc.form.copiesLabel")}</FormLabel>
              <FormControl>
                <input
                  type="number"
                  min={1}
                  max={10}
                  className={inputClassName}
                  value={field.value}
                  onChange={(e) =>
                    field.onChange(Number.parseInt(e.target.value, 10) || 1)
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="purpose"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{tx("doc.form.purposeLabel")}</FormLabel>
              <FormControl>
                <textarea
                  className="min-h-[80px] w-full rounded-lg border border-input px-3 py-2 text-sm"
                  placeholder={tx("doc.form.purposePlaceholder")}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" disabled={submitting}>
          {submitting ? tx("liff.common.submitting") : tx("doc.form.submit")}
        </Button>
      </form>
    </Form>
  )
}
