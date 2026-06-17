import { PRODUCT_NAME } from "@/lib/brand/product"
import { BRAND_LOGIN_HERO } from "@/lib/brand/assets"
import { cn } from "@/lib/utils"

const SIDEBAR_MASCOT = "/brand/mascot-hd.png"

function MascotImage({
  width,
  height,
  className,
}: {
  width: number
  height: number
  className?: string
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={SIDEBAR_MASCOT}
      alt={`${PRODUCT_NAME} mascot`}
      width={width}
      height={height}
      className={className}
      decoding="async"
    />
  )
}

export function BrandMark({
  variant = "sidebar",
  className,
}: {
  variant?: "sidebar" | "login" | "hero"
  className?: string
  /** @deprecated Hero/login assets no longer need dark-mode text */
  onDark?: boolean
}) {
  if (variant === "hero") {
    return (
      <MascotImage
        width={200}
        height={240}
        className={cn("h-auto w-[200px] object-contain drop-shadow-2xl", className)}
      />
    )
  }

  if (variant === "login") {
    return (
      <div className={cn("flex flex-col items-center", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={BRAND_LOGIN_HERO}
          alt={`${PRODUCT_NAME} — HR & Payroll`}
          width={320}
          height={240}
          className="h-auto w-full max-w-[280px] object-contain drop-shadow-2xl"
          decoding="async"
        />
      </div>
    )
  }

  return (
    <div className={cn("flex min-w-0 items-center gap-3.5", className)}>
      <MascotImage
        width={80}
        height={96}
        className="h-[88px] w-[74px] shrink-0 object-contain object-bottom"
      />
      <div className="min-w-0 flex-1 py-0.5">
        <p
          className="text-[22px] font-bold leading-none text-foreground"
          style={{ fontFamily: "var(--font-noto-sc), sans-serif" }}
        >
          {PRODUCT_NAME}
        </p>
        <p className="mt-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-foreground/65">
          HR &amp; Payroll
        </p>
      </div>
    </div>
  )
}
