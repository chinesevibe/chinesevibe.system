import { cn } from "@/lib/utils"

const MASCOT = "/brand/mascot-hd.png"

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
      src={MASCOT}
      alt="中国名堂 mascot"
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
  onDark = false,
}: {
  variant?: "sidebar" | "login" | "hero"
  className?: string
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
        <MascotImage
          width={160}
          height={192}
          className="h-auto w-40 object-contain drop-shadow-2xl"
        />
        <p
          className={cn(
            "mt-3 text-2xl font-bold tracking-tight",
            onDark ? "text-white" : "text-foreground"
          )}
          style={{ fontFamily: "var(--font-noto-sc), sans-serif" }}
        >
          中国名堂
        </p>
        <p
          className={cn(
            "mt-0.5 text-[10px] font-medium uppercase tracking-[0.35em]",
            onDark ? "text-white/80" : "text-muted-foreground"
          )}
        >
          Zhongguo Mingtang
        </p>
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
          中国名堂
        </p>
        <p className="mt-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-foreground/65">
          Zhongguomingtang
        </p>
      </div>
    </div>
  )
}
