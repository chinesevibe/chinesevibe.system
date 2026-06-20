import Link from "next/link"
import {
  Building2,
  CreditCard,
  FileText,
  Heart,
  Mail,
  User,
} from "lucide-react"

import { EmployeeAvatar } from "@/components/brand/EmployeeAvatar"
import { StatusPill } from "@/components/brand/StatusPill"
import type { EmployeeProfile } from "@/features/employees/profile/data"
import { paymentMethodLabel } from "@/features/employees/profile/payment-method"
import {
  ProfileField,
  ProfileSectionCard,
} from "@/features/employees/profile/ProfileSectionCard"
import { formatThaiDateOnly } from "@/lib/datetime/thailand"

const CONTRACT_LABEL: Record<string, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
}

function formatDate(value: string | null): string {
  return formatThaiDateOnly(value)
}

export function PortalProfileView({ profile }: { profile: EmployeeProfile }) {
  const employeeCode = profile.id.slice(0, 8).toUpperCase()

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm">
        <div className="relative bg-brand-red px-4 py-4 text-white md:px-5">
          <div
            className="pointer-events-none absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 30%, #fff 0, transparent 45%), radial-gradient(circle at 80% 70%, #fff 0, transparent 40%)",
            }}
          />
          <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
                </div>
                <p className="text-sm text-white/85">Employee ID · {employeeCode}</p>
                <p className="text-xs text-white/75">
                  {profile.position ?? "—"}
                  {profile.department ? ` · ${profile.department}` : ""}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/portal/attendance"
                className="rounded-lg border border-white/40 bg-white/10 px-3 py-1.5 text-xs font-medium hover:bg-white/20"
              >
                Attendance
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        <ProfileSectionCard title="Contact Information" icon={Mail}>
          <ProfileField label="Work Email" value={profile.email} />
          <ProfileField label="Work Phone" value={profile.phone} />
        </ProfileSectionCard>

        <ProfileSectionCard title="Emergency Contact" icon={Heart}>
          <ProfileField label="Contact Name" value="—" />
          <ProfileField label="Phone Number" value="—" />
        </ProfileSectionCard>

        <ProfileSectionCard title="Personal Information" icon={User}>
          <ProfileField label="Full Name" value={profile.name} />
          <ProfileField label="Date of Birth" value={formatDate(profile.date_of_birth)} />
        </ProfileSectionCard>

        <ProfileSectionCard title="Work Information" icon={Building2}>
          <ProfileField label="Department" value={profile.department} />
          <ProfileField label="Position" value={profile.position} />
          <ProfileField
            label="Employment Type"
            value={
              profile.contract_type
                ? CONTRACT_LABEL[profile.contract_type] ?? profile.contract_type
                : "—"
            }
          />
          <ProfileField
            label="Housing Allowance"
            value={profile.housing_allowance?.toLocaleString() ?? "—"}
          />
          <ProfileField label="Status" value={profile.status} />
        </ProfileSectionCard>

        <ProfileSectionCard title="Bank Account" icon={CreditCard}>
          <ProfileField
            label="Payment Method"
            value={paymentMethodLabel(profile.salary_payment_method)}
          />
          {profile.salary_payment_method === "bank" ? (
            <>
              <ProfileField label="Bank Name" value={profile.bank_name} />
              <ProfileField label="Account Number" value={profile.bank_account_number} />
            </>
          ) : profile.salary_payment_method === "cash" ? (
            <ProfileField label="Note" value="รับเงินเดือนเป็นเงินสด" />
          ) : null}
        </ProfileSectionCard>

        <ProfileSectionCard title="Tax & Social Security" icon={FileText}>
          <ProfileField label="Visa Expiry" value={formatDate(profile.visa_expiry)} />
          <ProfileField
            label="Work Permit Expiry"
            value={formatDate(profile.work_permit_expiry)}
          />
          <ProfileField label="Contract End" value={formatDate(profile.contract_end)} />
          <ProfileField label="Visa Status" value={profile.visaStatus.label} />
          <ProfileField
            label="Work Permit Status"
            value={profile.workPermitStatus.label}
          />
        </ProfileSectionCard>
      </div>
    </div>
  )
}
