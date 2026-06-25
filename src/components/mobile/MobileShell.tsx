import Link from "next/link"

// CNV Brand color
const RED = "#E11D2A"

interface MobileShellProps {
  children: React.ReactNode
  /** Active tab: "home" | "stock" | "inbound" | "damage" | "menu" */
  activeTab?: "home" | "stock" | "inbound" | "damage" | "menu"
  /** Show full home-style header (logo + branch) instead of back header */
  variant?: "home" | "back"
  /** Page title for back header */
  title?: string
  /** Optional scan icon on back header */
  showScan?: boolean
  /** Branch name to display (home header) */
  branchName?: string | null
}

const NAV_ITEMS = [
  { key: "home", label: "Home", icon: HomeIcon, href: "/m/inventory" },
  { key: "stock", label: "สต็อก", icon: BoxIcon, href: "/m/inventory/stock" },
  { key: "inbound", label: "รับเข้า", icon: TruckIcon, href: "/m/inventory/inbound" },
  { key: "damage", label: "เสียหาย", icon: AlertIcon, href: "/m/inventory/damage" },
  { key: "menu", label: "เมนู", icon: MenuIcon, href: "/portal/inventory" },
] as const

export function MobileShell({
  children,
  activeTab = "home",
  variant = "back",
  title,
  showScan = false,
  branchName,
}: MobileShellProps) {
  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ background: "#f4f5f7", fontFamily: "'IBM Plex Sans Thai', sans-serif" }}
    >
      {/* Google Font */}
      <style>{`@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@300;400;500;600;700&display=swap');`}</style>

      {/* Header */}
      {variant === "home" ? (
        <HomeHeader branchName={branchName} />
      ) : (
        <BackHeader title={title ?? ""} showScan={showScan} />
      )}

      {/* Page content */}
      <div className="flex flex-1 flex-col pb-20">{children}</div>

      {/* Bottom Nav */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 flex items-stretch border-t border-[#eceef1] bg-white"
        style={{ height: 64 }}
      >
        {NAV_ITEMS.map(({ key, label, icon: Icon, href }) => {
          const isActive = activeTab === key
          return (
            <Link
              key={key}
              href={href}
              className="flex flex-1 flex-col items-center justify-center gap-0.5 transition-opacity active:opacity-70"
              style={{ color: isActive ? RED : "#6b7280" }}
            >
              <Icon active={isActive} />
              <span className={`text-[10px] font-medium ${isActive ? "font-semibold" : ""}`}>{label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}

/** Home-style header: CNV logo + title + branch + bell */
function HomeHeader({ branchName }: { branchName?: string | null }) {
  return (
    <header
      className="flex items-center justify-between px-4 py-3"
      style={{ background: RED }}
    >
      <div className="flex items-center gap-2.5">
        {/* CNV logo square */}
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20">
          <span className="text-sm font-bold text-white tracking-tight">CNV</span>
        </div>
        <div>
          <p className="text-[11px] font-medium text-white/70 leading-none">CNV</p>
          <p className="text-base font-bold text-white leading-tight">WORK HUB</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {branchName && (
          <span className="rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-medium text-white">
            📍 {branchName}
          </span>
        )}
        <button className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white active:bg-white/30">
          <BellIcon />
        </button>
      </div>
    </header>
  )
}

/** Back-style header: back arrow + title + optional scan icon */
function BackHeader({ title, showScan }: { title: string; showScan: boolean }) {
  return (
    <header
      className="flex items-center justify-between px-4 py-3"
      style={{ background: RED, minHeight: 56 }}
    >
      <Link
        href="/m/inventory"
        className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white active:bg-white/30"
      >
        <ChevronLeftIcon />
      </Link>
      <h1 className="flex-1 text-center text-base font-semibold text-white">{title}</h1>
      {showScan ? (
        <Link
          href="/liff/inbound-scan"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white active:bg-white/30"
        >
          <ScanIcon />
        </Link>
      ) : (
        <div className="h-8 w-8" />
      )}
    </header>
  )
}

// ── Inline SVG icons ──────────────────────────────────────────────────────────

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={active ? "#E11D2A" : "none"} stroke={active ? "#E11D2A" : "#6b7280"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}

function BoxIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? "#E11D2A" : "#6b7280"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  )
}

function TruckIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? "#E11D2A" : "#6b7280"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="15" height="13" />
      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  )
}

function AlertIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? "#E11D2A" : "#6b7280"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

function MenuIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? "#E11D2A" : "#6b7280"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  )
}

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

function ChevronLeftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}

function ScanIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="5" height="5" />
      <rect x="16" y="3" width="5" height="5" />
      <rect x="3" y="16" width="5" height="5" />
      <path d="M21 16h-3a2 2 0 0 0-2 2v3" />
      <path d="M21 21v.01" />
      <path d="M12 7v3a2 2 0 0 1-2 2H7" />
      <path d="M3 12h.01" />
      <path d="M12 3h.01" />
      <path d="M12 16v.01" />
      <path d="M16 12h1" />
      <path d="M21 12v.01" />
      <path d="M12 21v-1" />
    </svg>
  )
}
