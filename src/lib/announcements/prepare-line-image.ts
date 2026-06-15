/** LINE image messages: JPEG/PNG, max 1024×1024 — resize on client before upload */
const LINE_IMAGE_MAX_PX = 1024
const LINE_IMAGE_JPEG_QUALITY = 0.88

export async function prepareAnnouncementImageForLine(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file

  const bitmap = await createImageBitmap(file)
  const needsResize = bitmap.width > LINE_IMAGE_MAX_PX || bitmap.height > LINE_IMAGE_MAX_PX
  const needsConvert = file.type !== "image/jpeg" && file.type !== "image/png"

  if (!needsResize && !needsConvert && file.type === "image/jpeg") {
    bitmap.close()
    return file
  }

  const scale = Math.min(
    1,
    LINE_IMAGE_MAX_PX / bitmap.width,
    LINE_IMAGE_MAX_PX / bitmap.height
  )
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))

  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d")
  if (!ctx) {
    bitmap.close()
    return file
  }
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", LINE_IMAGE_JPEG_QUALITY)
  )
  if (!blob) return file

  const baseName = file.name.replace(/\.[^.]+$/, "") || "announcement"
  return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" })
}
