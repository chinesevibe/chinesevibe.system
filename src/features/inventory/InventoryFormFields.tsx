import { cn } from "@/lib/utils"

import { invInputClass, invLabelClass } from "./form-styles"

export function InventoryFormField({
  label,
  htmlFor,
  children,
  className,
}: {
  label: string
  htmlFor?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <label htmlFor={htmlFor} className={invLabelClass}>
        {label}
      </label>
      {children}
    </div>
  )
}

export function InventoryTextInput({
  id,
  name,
  type = "text",
  required,
  defaultValue,
  placeholder,
  min,
  step,
  disabled,
}: {
  id?: string
  name: string
  type?: string
  required?: boolean
  defaultValue?: string | number
  placeholder?: string
  min?: string | number
  step?: string | number
  disabled?: boolean
}) {
  return (
    <input
      id={id}
      name={name}
      type={type}
      required={required}
      defaultValue={defaultValue}
      placeholder={placeholder}
      min={min}
      step={step}
      disabled={disabled}
      className={invInputClass}
    />
  )
}

export function InventorySelect({
  id,
  name,
  required,
  defaultValue,
  disabled,
  children,
}: {
  id?: string
  name: string
  required?: boolean
  defaultValue?: string
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <select
      id={id}
      name={name}
      required={required}
      defaultValue={defaultValue}
      disabled={disabled}
      className={invInputClass}
    >
      {children}
    </select>
  )
}

export function InventoryFormError({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      {message}
    </div>
  )
}

export function InventoryFormActions({
  cancelHref,
  submitLabel,
  pending,
  pendingLabel,
}: {
  cancelHref: string
  submitLabel: string
  pending?: boolean
  pendingLabel?: string
}) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <a
        href={cancelHref}
        className="inline-flex h-9 items-center rounded-lg border border-input px-4 text-sm font-medium hover:bg-muted"
      >
        ยกเลิก
      </a>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-9 items-center rounded-lg bg-brand-red px-4 text-sm font-medium text-white hover:bg-brand-red/90 disabled:opacity-50"
      >
        {pending ? (pendingLabel ?? "กำลังบันทึก...") : submitLabel}
      </button>
    </div>
  )
}
