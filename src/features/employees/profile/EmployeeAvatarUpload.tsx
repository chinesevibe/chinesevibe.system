"use client"

import Image from "next/image"
import { useRouter } from "next/navigation"
import { useRef, useState } from "react"
import { ImagePlus, Trash2, X } from "lucide-react"

import { EmployeeAvatar } from "@/components/brand/EmployeeAvatar"
import { Button } from "@/components/ui/button"
import {
  EMPLOYEE_AVATAR_TYPES,
  employeeAvatarPublicUrl,
} from "@/lib/employees/avatar"
import { prepareAvatarImage } from "@/lib/employees/prepare-avatar-image"

export function EmployeeAvatarUpload({
  employeeId,
  name,
  avatarPath,
}: {
  employeeId: string
  name: string
  avatarPath: string | null
}) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)

  const imageUrl = preview ?? employeeAvatarPublicUrl(avatarPath)

  async function onFileSelected(file: File | null) {
    if (!file) return
    setError(null)
    setBusy(true)
    try {
      const prepared = await prepareAvatarImage(file)
      setPreview(URL.createObjectURL(prepared))

      const form = new FormData()
      form.append("avatar", prepared)
      const res = await fetch(`/api/employees/${employeeId}/avatar`, {
        method: "POST",
        body: form,
      })
      const body = (await res.json().catch(() => null)) as { error?: string } | null
      if (!res.ok) throw new Error(body?.error ?? "อัปโหลดไม่สำเร็จ")

      router.refresh()
    } catch (e) {
      setPreview(null)
      setError(e instanceof Error ? e.message : "อัปโหลดไม่สำเร็จ")
    } finally {
      setBusy(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  async function removeAvatar() {
    setError(null)
    setBusy(true)
    try {
      const res = await fetch(`/api/employees/${employeeId}/avatar`, {
        method: "DELETE",
      })
      const body = (await res.json().catch(() => null)) as { error?: string } | null
      if (!res.ok) throw new Error(body?.error ?? "ลบรูปไม่สำเร็จ")
      setPreview(null)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "ลบรูปไม่สำเร็จ")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative">
        {imageUrl ? (
          <span className="relative inline-flex size-20 shrink-0 overflow-hidden rounded-full border-2 border-border">
            <Image
              src={imageUrl}
              alt={name}
              fill
              unoptimized
              className="object-cover"
            />
          </span>
        ) : (
          <EmployeeAvatar name={name} size="lg" />
        )}
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept={EMPLOYEE_AVATAR_TYPES.join(",")}
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
            <ImagePlus className="size-4" />
            {imageUrl ? "เปลี่ยนรูปโปรไฟล์" : "อัปโหลดรูปโปรไฟล์"}
          </Button>
          {avatarPath || preview ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="gap-1.5 text-muted-foreground"
              disabled={busy}
              onClick={removeAvatar}
            >
              <Trash2 className="size-4" />
              ลบรูป
            </Button>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">
          JPEG, PNG, WebP · สูงสุด 3 MB · แนะนำรูปสี่เหลี่ยมจัตุรัส
        </p>
        {error ? (
          <p className="flex items-center gap-1 text-xs text-destructive">
            <X className="size-3.5 shrink-0" />
            {error}
          </p>
        ) : null}
      </div>
    </div>
  )
}
