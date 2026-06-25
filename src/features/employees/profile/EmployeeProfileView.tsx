import {
  Building2,
  FileText,
  Mail,
  User,
} from "lucide-react"
import Link from "next/link"

import { EmployeeAvatar } from "@/components/brand/EmployeeAvatar"
import { StatusPill } from "@/components/brand/StatusPill"
import { buttonVariants } from "@/components/ui/button"
import type { EmployeeProfile } from "@/features/employees/profile/data"
import { paymentMethodLabel } from "@/features/employees/profile/payment-method"
import {
  ProfileField,
  ProfileSectionCard,
} from "@/features/employees/profile/ProfileSectionCard"
import { SalarySensitiveView } from "@/features/employees/profile/SalarySensitiveSection"
import { formatThaiDateOnly } from "@/lib/datetime/thailand"
import { payDayLabel, nationalityLabel } from "@/lib/payroll/pay-day"
import { PAY_TYPE_OPTIONS } from "@/lib/payroll/pay-type"
import { cn } from "@/lib/utils"

const profileActionLinkClass = cn(
  buttonVariants({ size: "sm", variant: "outline" }),
  "border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white"
)

const CONTRACT_LABEL: Record<string, string> = {
  full_time: "พนักงานประจำ",
  part_time: "พนักงานพาร์ทไทม์",
  contract: "พนักงานสัญญาจ้าง",
}

const ROLE_LABEL: Record<string, string> = {
  hr_admin: "HR Admin",
  manager: "ผู้จัดการ",
  employee: "พนักงาน",
  ceo: "CEO",
  dev: "Dev",
}

function formatDate(value: string | null): string {
  return formatThaiDateOnly(value)
}

export function EmployeeProfileView({
  profile,
  actions,
  canViewSalary = false,
  attendanceHref,
}: {
  profile: EmployeeProfile
  actions?: React.ReactNode
  canViewSalary?: boolean
  attendanceHref: string
}) {
  const employeeCode =
    profile.employee_code?.trim() || profile.id.slice(0, 8).toUpperCase()

  return (
    <div className="flex flex-col gap-2">
      <div className="shrink-0 overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm">
        <div className="relative bg-brand-red px-4 py-4 text-white md:px-5">
          <div
            className="pointer-events-none absolute inset-0 z-0 opacity-20"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 30%, #fff 0, transparent 45%), radial-gradient(circle at 80% 70%, #fff 0, transparent 40%)",
            }}
          />
          <div className="relative z-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <EmployeeAvatar
                name={profile.name}
                imageUrl={profile.avatarUrl}
                size="lg"
              />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-xl font-bold">{profile.name}</h1>
                  <StatusPill
                    label={profile.status === "active" ? "Active" : "Inactive"}
                    variant={profile.status === "active" ? "approved" : "neutral"}
                  />
                  {profile.leave_blacklisted ? (
                    <StatusPill label="Leave Blacklist" variant="rejected" />
                  ) : null}
                </div>
                <p className="text-sm text-white/85">
                  รหัสพนักงาน · {employeeCode}
                </p>
                <p className="text-xs text-white/75">
                  {profile.contract_start
                    ? `เริ่มงาน ${formatDate(profile.contract_start)}`
                    : "เริ่มงาน —"}
                  {profile.probation_end
                    ? ` · ทดลองงานถึง ${formatDate(profile.probation_end)}`
                    : ""}
                </p>
              </div>
            </div>
            <div className="relative z-10 flex flex-wrap items-center gap-2">
              {actions}
              <Link
                href={attendanceHref}
                className={profileActionLinkClass}
              >
                ประวัติเข้างาน
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        <ProfileSectionCard title="ข้อมูลการติดต่อ" icon={Mail}>
          <ProfileField label="อีเมลงาน" value={profile.email} />
          <ProfileField label="เบอร์โทรงาน" value={profile.phone} />
          <ProfileField label="LINE User ID" value={profile.line_user_id} />
        </ProfileSectionCard>

        <ProfileSectionCard title="ข้อมูลส่วนตัว" icon={User}>
          <ProfileField label="วันเกิด" value={formatDate(profile.date_of_birth)} />
          <ProfileField
            label="สัญชาติ"
            value={nationalityLabel(profile.nationality)}
          />
          <ProfileField label="รหัสพนักงาน" value={profile.employee_code} />
        </ProfileSectionCard>

        <ProfileSectionCard title="ข้อมูลการทำงาน" icon={Building2}>
          <ProfileField label="แผนก" value={profile.department} />
          <ProfileField label="ตำแหน่ง" value={profile.position} />
          <ProfileField
            label="ประเภทสัญญา"
            value={
              profile.contract_type
                ? CONTRACT_LABEL[profile.contract_type] ?? profile.contract_type
                : "—"
            }
          />
          <ProfileField
            label="สิทธิ์ระบบ"
            value={ROLE_LABEL[profile.role] ?? profile.role}
          />
          <ProfileField
            label="สัญญาจ้าง (ไฟล์)"
            value={
              profile.contract_file_name ? (
                <a
                  href={`/api/employees/${profile.id}/contract`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-brand-red hover:underline"
                >
                  <FileText className="size-4 shrink-0" aria-hidden />
                  {profile.contract_file_name}
                </a>
              ) : (
                "—"
              )
            }
          />
        </ProfileSectionCard>

        <SalarySensitiveView canAccess={canViewSalary}>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            <ProfileField
              label="ประเภทการจ่าย"
              value={
                PAY_TYPE_OPTIONS.find((o) => o.value === profile.pay_type)?.label ??
                profile.pay_type
              }
            />
            <ProfileField
              label="เงินเดือน (บาท)"
              value={profile.salary?.toLocaleString() ?? "—"}
            />
            <ProfileField
              label="เบี้ยเลี้ยงที่พัก"
              value={profile.housing_allowance?.toLocaleString() ?? "—"}
            />
            <ProfileField
              label="วันจ่ายเงินเดือน"
              value={profile.pay_day ? payDayLabel(profile.pay_day) : "—"}
            />
            <ProfileField
              label="วิธีรับเงินเดือน"
              value={
                profile.salary_payment_method
                  ? paymentMethodLabel(profile.salary_payment_method)
                  : profile.bank_account_number
                    ? paymentMethodLabel("bank")
                    : "—"
              }
            />
            {profile.salary_payment_method === "cash" ? (
              <ProfileField label="หมายเหตุ" value="รับเงินเดือนเป็นเงินสด" />
            ) : profile.salary_payment_method === "bank" ||
              profile.bank_account_number ? (
              <>
                <ProfileField label="ธนาคาร" value={profile.bank_name} />
                <ProfileField label="ชื่อบัญชี" value={profile.bank_account_name} />
                <ProfileField label="เลขบัญชี" value={profile.bank_account_number} />
                <ProfileField label="สาขาธนาคาร" value={profile.bank_branch} />
              </>
            ) : null}
          </div>
        </SalarySensitiveView>

        <ProfileSectionCard title="วีซ่า & ใบอนุญาต" icon={FileText}>
          <ProfileField label="วีซ่าหมดอายุ" value={formatDate(profile.visa_expiry)} />
          <ProfileField
            label="ใบอนุญาตทำงานหมด"
            value={formatDate(profile.work_permit_expiry)}
          />
          <ProfileField label="สิ้นสุดสัญญา" value={formatDate(profile.contract_end)} />
          <ProfileField
            label="ผลทดลองงาน"
            value={profile.probation_outcome ?? profile.probationStatus}
          />
          <ProfileField label="สถานะวีซ่า" value={profile.visaStatus.label} />
          <ProfileField label="สถานะใบอนุญาต" value={profile.workPermitStatus.label} />
        </ProfileSectionCard>
      </div>
    </div>
  )
}
