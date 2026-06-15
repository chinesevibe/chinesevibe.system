import Image from "next/image"

import { cn } from "@/lib/utils"

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase()
  }
  return (parts[0]?.slice(0, 2) ?? "?").toUpperCase()
}

export function EmployeeAvatar({
  name,
  imageUrl,
  size = "md",
  className,
}: {
  name: string
  imageUrl?: string | null
  size?: "sm" | "md" | "lg"
  className?: string
}) {
  const sizes = {
    sm: "size-8 text-[10px]",
    md: "size-10 text-xs",
    lg: "size-20 text-lg",
  }

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white/30 bg-brand-red/10 font-semibold text-brand-red",
        sizes[size],
        className
      )}
    >
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={name}
          fill
          unoptimized
          className="object-cover"
        />
      ) : (
        <span aria-hidden>{initialsFromName(name)}</span>
      )}
    </span>
  )
}
