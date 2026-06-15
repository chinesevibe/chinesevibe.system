"use client"

import Image from "next/image"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import { ImagePlus, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  ANNOUNCEMENT_IMAGE_MAX_BYTES,
  ANNOUNCEMENT_IMAGE_TYPES,
} from "@/lib/announcements/image"
import { prepareAnnouncementImageForLine } from "@/lib/announcements/prepare-line-image"

export function AnnouncementComposeForm({
  departments,
}: {
  departments: string[]
}) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [targetType, setTargetType] = useState<"all" | "department">("all")
  const [targetValue, setTargetValue] = useState("")
  const [scheduleAt, setScheduleAt] = useState("")
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const imagePreview = useMemo(
    () => (imageFile ? URL.createObjectURL(imageFile) : null),
    [imageFile]
  )

  useEffect(() => {
    if (!imagePreview) return
    return () => URL.revokeObjectURL(imagePreview)
  }, [imagePreview])

  function clearImage() {
    setImageFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  async function onImageSelected(file: File | null) {
    setError(null)
    setMessage(null)
    if (!file) {
      clearImage()
      return
    }
    if (
      !ANNOUNCEMENT_IMAGE_TYPES.includes(
        file.type as (typeof ANNOUNCEMENT_IMAGE_TYPES)[number]
      )
    ) {
      setError("รองรับเฉพาะ JPEG, PNG, WebP หรือ GIF")
      clearImage()
      return
    }
    if (file.size > ANNOUNCEMENT_IMAGE_MAX_BYTES) {
      setError("รูปภาพต้องไม่เกิน 5 MB")
      clearImage()
      return
    }
    try {
      const prepared = await prepareAnnouncementImageForLine(file)
      setImageFile(prepared)
      if (prepared !== file) {
        setMessage("ปรับขนาดรูปให้เหมาะกับ LINE แล้ว (สูงสุด 1024px)")
      }
    } catch {
      setImageFile(file)
    }
  }

  async function submit(mode: "send" | "draft" | "schedule") {
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const formData = new FormData()
      formData.append("title", title)
      formData.append("body", body)
      formData.append("targetType", targetType)
      if (targetType === "department") formData.append("targetValue", targetValue)
      formData.append("send", String(mode === "send"))
      formData.append("schedule", String(mode === "schedule"))
      if (mode === "schedule" && scheduleAt) {
        formData.append("scheduledAt", scheduleAt)
      }
      if (imageFile) formData.append("image", imageFile)

      const res = await fetch("/api/announcements", {
        method: "POST",
        body: formData,
      })
      const data = (await res.json().catch(() => null)) as {
        error?: string
        note?: string
      } | null
      if (!res.ok) {
        throw new Error(data?.error ?? "บันทึกไม่สำเร็จ")
      }
      setTitle("")
      setBody("")
      clearImage()
      if (data?.note) setMessage(data.note)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border p-4">
      <h3 className="text-sm font-semibold">สร้างประกาศใหม่</h3>
      <input
        className="h-9 rounded-lg border border-input px-3 text-sm"
        placeholder="หัวข้อประกาศ"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <textarea
        className="min-h-[140px] rounded-lg border border-input px-3 py-2 text-sm"
        placeholder="เนื้อหาประกาศ — ขึ้นบรรทัดใหม่และใส่ emoji ได้ (แสดงใน LINE ตามที่พิมพ์)"
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <div className="space-y-2">
        <label className="text-sm font-medium">แนบรูป (ไม่บังคับ)</label>
        <div className="flex flex-wrap items-start gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept={ANNOUNCEMENT_IMAGE_TYPES.join(",")}
            className="hidden"
            onChange={(e) => onImageSelected(e.target.files?.[0] ?? null)}
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
            เลือกรูป
          </Button>
          <p className="text-xs text-muted-foreground self-center">
            JPEG, PNG, WebP, GIF · สูงสุด 5 MB
          </p>
        </div>
        {imagePreview ? (
          <div className="relative inline-block max-w-sm">
            <Image
              src={imagePreview}
              alt="ตัวอย่างรูปประกาศ"
              width={320}
              height={180}
              unoptimized
              className="max-h-44 w-auto rounded-lg border object-contain"
            />
            <Button
              type="button"
              size="icon-sm"
              variant="secondary"
              className="absolute right-2 top-2"
              onClick={clearImage}
              aria-label="ลบรูป"
            >
              <X className="size-4" />
            </Button>
          </div>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-3 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            checked={targetType === "all"}
            onChange={() => setTargetType("all")}
          />
          ทุกคน
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            checked={targetType === "department"}
            onChange={() => setTargetType("department")}
          />
          ตามแผนก
        </label>
        {targetType === "department" ? (
          <select
            className="rounded-lg border border-input px-2 py-1"
            value={targetValue}
            onChange={(e) => setTargetValue(e.target.value)}
          >
            <option value="">เลือกแผนก</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <label className="text-muted-foreground">กำหนดส่ง (เวลาไทย ICT):</label>
        <input
          type="datetime-local"
          className="rounded-lg border border-input px-2 py-1 text-sm"
          value={scheduleAt}
          onChange={(e) => setScheduleAt(e.target.value)}
        />
      </div>
      {message ? <p className="text-sm text-green-600">{message}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={busy} onClick={() => submit("send")}>
          {busy ? "…" : "ส่งประกาศทันที"}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={busy || !scheduleAt}
          onClick={() => submit("schedule")}
        >
          ตั้งเวลาส่ง
        </Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => submit("draft")}>
          บันทึกแบบร่าง
        </Button>
      </div>
    </div>
  )
}
