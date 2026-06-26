import path from "path"
import {
  Document,
  Font,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer"
import type { PayslipPdfInput, PdfLang } from "@/lib/payroll/payslip-pdf-types"
import { LABELS } from "@/lib/payroll/payslip-pdf-types"

// ---------------------------------------------------------------------------
// Font registration
// ---------------------------------------------------------------------------
const FONTS_DIR = path.join(process.cwd(), "public", "fonts")

Font.register({
  family: "NotoSansSC",
  src: path.join(FONTS_DIR, "NotoSansSC-Regular.ttf"),
})

Font.register({
  family: "NotoSans",
  src: path.join(FONTS_DIR, "NotoSans-Regular.ttf"),
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function fontFamily(lang: PdfLang): string {
  if (lang === "zh") return "NotoSansSC"
  // th and en use Latin font (no Thai font bundled — th payslip uses English labels)
  return "NotoSans"
}

function fmt(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(iso: string): string {
  if (!iso) return ""
  const [y, m, d] = iso.split("-")
  return `${d}/${m}/${y}`
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const COLORS = {
  primary: "#1a1a2e",
  accent: "#e94560",
  bg: "#f8f9fa",
  border: "#dee2e6",
  text: "#212529",
  muted: "#6c757d",
  white: "#ffffff",
  income: "#1a6b3c",
  deduct: "#c0392b",
}

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 9, color: COLORS.text },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.accent,
  },
  companyName: { fontSize: 18, fontWeight: "bold", color: COLORS.primary },
  companySubtitle: { fontSize: 8, color: COLORS.muted, marginTop: 2 },
  titleBox: { alignItems: "flex-end" },
  titleText: { fontSize: 14, fontWeight: "bold", color: COLORS.accent },
  periodText: { fontSize: 8, color: COLORS.muted, marginTop: 2 },

  infoGrid: {
    flexDirection: "row",
    marginBottom: 12,
    backgroundColor: COLORS.bg,
    padding: 10,
    borderRadius: 4,
  },
  infoCol: { flex: 1 },
  infoRow: { flexDirection: "row", marginBottom: 3 },
  infoLabel: { width: 72, color: COLORS.muted, fontSize: 8 },
  infoValue: { flex: 1, fontWeight: "bold", fontSize: 8 },

  sectionTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: COLORS.white,
    backgroundColor: COLORS.primary,
    padding: "4 8",
    marginBottom: 0,
  },
  table: { borderWidth: 1, borderColor: COLORS.border, marginBottom: 10 },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    padding: "4 8",
    minHeight: 20,
    alignItems: "center",
  },
  tableRowLast: {
    flexDirection: "row",
    padding: "4 8",
    minHeight: 20,
    alignItems: "center",
  },
  tableRowAlt: { backgroundColor: COLORS.bg },
  lineLabel: { flex: 1, fontSize: 8 },
  lineNote: { flex: 1, fontSize: 7, color: COLORS.muted, marginTop: 1 },
  lineAmountIncome: { width: 80, textAlign: "right", fontSize: 8, color: COLORS.income },
  lineAmountDeduct: { width: 80, textAlign: "right", fontSize: 8, color: COLORS.deduct },

  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: "5 8",
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 4,
  },
  totalsLabel: { fontSize: 8, color: COLORS.muted },
  totalsValue: { fontSize: 9, fontWeight: "bold" },

  netBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    padding: "8 10",
    marginBottom: 10,
    borderRadius: 4,
  },
  netLabel: { fontSize: 10, color: COLORS.white, fontWeight: "bold" },
  netValue: { fontSize: 14, color: COLORS.accent, fontWeight: "bold" },

  ytdBox: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 8,
    marginBottom: 10,
    borderRadius: 4,
  },
  ytdItem: { alignItems: "center" },
  ytdLabel: { fontSize: 7, color: COLORS.muted },
  ytdValue: { fontSize: 9, fontWeight: "bold", marginTop: 2 },

  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  footerNote: { flex: 1, fontSize: 7, color: COLORS.muted },
  signatureBox: { width: 140, alignItems: "flex-end" },
  signatureLine: { borderBottomWidth: 1, borderBottomColor: COLORS.border, width: 120, marginBottom: 3 },
  signatureLabel: { fontSize: 7, color: COLORS.muted },
})

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function PayslipPdf({ input }: { input: PayslipPdfInput }) {
  const lang: PdfLang = input.lang ?? "zh"
  const L = LABELS[lang]
  const ff = fontFamily(lang)

  const incomeLines = input.lines.filter((l) => l.amount > 0)
  const deductLines = input.lines.filter((l) => l.amount < 0)
  const totalDeductions =
    input.ssoDeduction + input.taxDeduction + deductLines.reduce((s, l) => s + Math.abs(l.amount), 0)

  const hasYtd =
    input.ytdGross != null || input.ytdTax != null || input.ytdSso != null

  return (
    <Document>
      <Page size="A4" style={[styles.page, { fontFamily: ff }]}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.companyName}>{input.companyName}</Text>
            <Text style={styles.companySubtitle}>{input.branchName}</Text>
          </View>
          <View style={styles.titleBox}>
            <Text style={styles.titleText}>{L.title}</Text>
            <Text style={styles.periodText}>{input.periodLabel}</Text>
          </View>
        </View>

        {/* Employee Info */}
        <View style={styles.infoGrid}>
          <View style={styles.infoCol}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{L.employee}</Text>
              <Text style={styles.infoValue}>{input.employeeName}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{L.code}</Text>
              <Text style={styles.infoValue}>{input.employeeCode}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{L.department}</Text>
              <Text style={styles.infoValue}>{input.departmentName}</Text>
            </View>
          </View>
          <View style={styles.infoCol}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{L.payType}</Text>
              <Text style={styles.infoValue}>
                {input.payType === "hourly" ? L.payTypeHourly : L.payTypeMonthly}
                {input.payType === "hourly" && input.regularHours != null
                  ? `  (${input.regularHours}${lang === "zh" ? "时" : lang === "th" ? "ชม." : "h"}${
                      input.otHours ? ` + OT ${input.otHours}${lang === "zh" ? "时" : lang === "th" ? "ชม." : "h"}` : ""
                    })`
                  : ""}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{L.period}</Text>
              <Text style={styles.infoValue}>
                {fmtDate(input.periodStart)} – {fmtDate(input.periodEnd)}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{L.paymentDate}</Text>
              <Text style={styles.infoValue}>{fmtDate(input.paymentDate)}</Text>
            </View>
          </View>
        </View>

        {/* Income */}
        <Text style={styles.sectionTitle}>{L.income}</Text>
        <View style={styles.table}>
          {incomeLines.map((line, i) => (
            <View
              key={i}
              style={[
                i < incomeLines.length - 1 ? styles.tableRow : styles.tableRowLast,
                i % 2 === 1 ? styles.tableRowAlt : {},
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.lineLabel}>{line.label}</Text>
                {line.note ? <Text style={styles.lineNote}>{line.note}</Text> : null}
              </View>
              <Text style={styles.lineAmountIncome}>{fmt(line.amount)}</Text>
            </View>
          ))}
        </View>

        {/* Deductions */}
        {deductLines.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>{L.deductions}</Text>
            <View style={styles.table}>
              {deductLines.map((line, i) => (
                <View
                  key={i}
                  style={[
                    i < deductLines.length - 1 ? styles.tableRow : styles.tableRowLast,
                    i % 2 === 1 ? styles.tableRowAlt : {},
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.lineLabel}>{line.label}</Text>
                    {line.note ? <Text style={styles.lineNote}>{line.note}</Text> : null}
                  </View>
                  <Text style={styles.lineAmountDeduct}>({fmt(Math.abs(line.amount))})</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Totals */}
        <View style={styles.totalsRow}>
          <View>
            <Text style={styles.totalsLabel}>{L.grossAmount}</Text>
            <Text style={styles.totalsValue}>{fmt(input.grossAmount)}</Text>
          </View>
          <View style={{ alignItems: "center" }}>
            <Text style={styles.totalsLabel}>{L.totalDeductions}</Text>
            <Text style={[styles.totalsValue, { color: COLORS.deduct }]}>{fmt(totalDeductions)}</Text>
          </View>
        </View>

        {/* Net */}
        <View style={styles.netBox}>
          <Text style={styles.netLabel}>{L.netAmount}</Text>
          <Text style={styles.netValue}>{fmt(input.netAmount)}</Text>
        </View>

        {/* YTD */}
        {hasYtd && (
          <>
            <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>{L.ytd}</Text>
            <View style={styles.ytdBox}>
              {input.ytdGross != null && (
                <View style={styles.ytdItem}>
                  <Text style={styles.ytdLabel}>{L.ytdGross}</Text>
                  <Text style={styles.ytdValue}>{fmt(input.ytdGross)}</Text>
                </View>
              )}
              {input.ytdTax != null && (
                <View style={styles.ytdItem}>
                  <Text style={styles.ytdLabel}>{L.ytdTax}</Text>
                  <Text style={styles.ytdValue}>{fmt(input.ytdTax)}</Text>
                </View>
              )}
              {input.ytdSso != null && (
                <View style={styles.ytdItem}>
                  <Text style={styles.ytdLabel}>{L.ytdSso}</Text>
                  <Text style={styles.ytdValue}>{fmt(input.ytdSso)}</Text>
                </View>
              )}
            </View>
          </>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerNote}>
            <Text>{L.note}: _________________________________</Text>
          </View>
          <View style={styles.signatureBox}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>{L.signature}</Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}
