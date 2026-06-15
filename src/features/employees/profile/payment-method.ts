export type SalaryPaymentMethod = "cash" | "bank" | null

export const PAYMENT_METHOD_OPTIONS: Array<{
  value: Exclude<SalaryPaymentMethod, null>
  label: string
}> = [
  { value: "cash", label: "รับเงินสด" },
  { value: "bank", label: "โอนเข้าบัญชีธนาคาร" },
]

export function paymentMethodLabel(method: SalaryPaymentMethod): string {
  if (method === "cash") return "รับเงินสด"
  if (method === "bank") return "โอนเข้าบัญชีธนาคาร"
  return "—"
}
