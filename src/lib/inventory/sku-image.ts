export const INVENTORY_SKU_IMAGE_BUCKET = "inventory-damage-photos"
export const INVENTORY_SKU_IMAGE_MAX_BYTES = 5 * 1024 * 1024
export const INVENTORY_SKU_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const

export function sanitizeInventorySkuImageFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "sku-image"
}
