/** Profile photos: square JPEG, max 512px for fast loads */
const AVATAR_MAX_PX = 512
const AVATAR_JPEG_QUALITY = 0.88

export async function prepareAvatarImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file

  const needsConvert = file.type !== "image/jpeg" && file.type !== "image/png"
  const bitmap = await createImageBitmap(file)
  const maxSide = Math.max(bitmap.width, bitmap.height)
  const needsResize = maxSide > AVATAR_MAX_PX

  if (!needsResize && !needsConvert && file.type === "image/jpeg") {
    bitmap.close()
    return file
  }

  const scale = needsResize ? AVATAR_MAX_PX / maxSide : 1
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

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", AVATAR_JPEG_QUALITY)
  })
  if (!blob) return file

  const baseName = file.name.replace(/\.[^.]+$/, "") || "avatar"
  return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" })
}
