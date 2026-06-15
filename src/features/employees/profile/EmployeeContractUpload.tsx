"use client"

import { useRouter } from "next/navigation"
import { useRef, useState } from "react"
import { FileText, Paperclip, Trash2, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { EMPLOYEE_CONTRACT_TYPES } from "@/lib/employees/contract"
import { formatThaiDateTime } from "@/lib/datetime/thailand"

export function EmployeeContractUpload({
  employeeId,
  contractFileName,
  contractUploadedAt,
}: {
  employeeId: string
  contractFileName: string | null
  contractUploadedAt: string | null
}) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [localName, setLocalName] = useState<string | null>(null)

  const displayName = localName ?? contractFileName

  async function onFileSelected(file: File | null) {
    if (!file) return
    setError(null)
    setBusy(true)
    try {
      const form = new FormData()
      form.append("contract", file)
      const res = await fetch(`/api/employees/${employeeId}/contract`, {
        method: "POST",
        body: form,
      })
      const body = (await res.json().catch(() => null)) as {
        error?: string
        contract_file_name?: string
      } | null
      if (!res.ok) throw new Error(body?.error ?? "อัปโหลดไม่สำเร็จ")
      setLocalName(body?.contract_file_name ?? file.name)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "อัปโหลดไม่สำเร็จ")
    } finally {
      setBusy(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  async function removeContract() {
    setError(null)
    setBusy(true)
    try {
      const res = await fetch(`/api/employees/${employeeId}/contract`, {
        method: "DELETE",
      })
      const body = (await res.json().catch(() => null)) as { error?: string } | null
      if (!res.ok) throw new Error(body?.error ?? "ลบไฟล์ไม่สำเร็จ")
      setLocalName(null)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "ลบไฟล์ไม่สำเร็จ")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="col-span-full space-y-2 border-t border-dashed border-border/80 pt-3">
      <p className="text-xs font-medium text-muted-foreground">ไฟล์สัญญาจ้าง</p>
      {displayName ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/80 bg-muted/30 px-3 py-2">
          <FileText className="size-4 shrink-0 text-brand-red" aria-hidden />
          <a
            href={`/api/employees/${employeeId}/contract`}
            target="_blank"
            rel="noopener noreferrer"
            className="min-w-0 flex-1 truncate text-sm font-medium text-brand-red hover:underline"
          >
            {displayName}
          </a>
          {contractUploadedAt ? (
            <span className="text-xs text-muted-foreground">
              อัปโหลด {formatThaiDateTime(contractUploadedAt)}
            </span>
          ) : null}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">ยังไม่มีไฟล์แนบ</p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept={EMPLOYEE_CONTRACT_TYPES.join(",")}
          className="hidden"
          onChange={(e) => onFileSelected(e.target.files?.[0] ?? null)}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="gap-1.5"
          disabled={busy}
          onClick={() => fileInputRef.current?.click()}
        >
          <Paperclip className="size-4" />
          {displayName ? "เปลี่ยนไฟล์สัญญา" : "แนบไฟล์สัญญา"}
        </Button>
        {displayName ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="gap-1.5 text-muted-foreground"
            disabled={busy}
            onClick={() => void removeContract()}
          >
            <Trash2 className="size-4" />
            ลบไฟล์
          </Button>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">
        PDF, JPEG, PNG · สูงสุด 5 MB · เก็บไฟล์ล่าสุด 1 ฉบับต่อพนักงาน
      </p>
      {error ? (
        <p className="flex items-center gap-1 text-xs text-destructive">
          <X className="size-3.5 shrink-0" />
          {error}
        </p>
      ) : null}
    </div>
  )
}
