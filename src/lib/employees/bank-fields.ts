import type { SalaryPaymentMethod } from "@/features/employees/profile/payment-method"

export type BankFieldsInput = {
  salary_payment_method?: SalaryPaymentMethod
  bank_name?: string | null
  bank_account_name?: string | null
  bank_account_number?: string | null
  bank_branch?: string | null
}

export function normalizeBankFields(body: BankFieldsInput): {
  updates: Record<string, unknown>
  error?: string
} {
  if (body.salary_payment_method === undefined) {
    return { updates: {} }
  }

  const method = body.salary_payment_method
  if (method !== null && method !== "cash" && method !== "bank") {
    return { updates: {}, error: "invalid salary_payment_method" }
  }

  if (method === "cash" || method === null) {
    return {
      updates: {
        salary_payment_method: method,
        bank_name: null,
        bank_account_name: null,
        bank_account_number: null,
        bank_branch: null,
      },
    }
  }

  const bankName =
    typeof body.bank_name === "string" && body.bank_name.trim()
      ? body.bank_name.trim()
      : null
  const accountNumber =
    typeof body.bank_account_number === "string" && body.bank_account_number.trim()
      ? body.bank_account_number.trim()
      : null

  if (!accountNumber) {
    return {
      updates: {},
      error: "กรุณาระบุเลขที่บัญชีเมื่อเลือกโอนเข้าบัญชีธนาคาร",
    }
  }

  return {
    updates: {
      salary_payment_method: "bank" as const,
      bank_name: bankName,
      bank_account_name:
        typeof body.bank_account_name === "string" && body.bank_account_name.trim()
          ? body.bank_account_name.trim()
          : null,
      bank_account_number: accountNumber,
      bank_branch:
        typeof body.bank_branch === "string" && body.bank_branch.trim()
          ? body.bank_branch.trim()
          : null,
    },
  }
}
