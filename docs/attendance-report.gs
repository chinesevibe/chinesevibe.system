/**
 * Attendance Summary Report — Google Apps Script
 * ส่งสรุปการเข้า-ออกงานไปยัง LINE กลุ่ม 3 รอบต่อวัน
 *
 * SETUP:
 * 1. เปิด Apps Script → Project Settings → Script Properties → Add:
 *    SUPABASE_URL       = https://xxxx.supabase.co
 *    SUPABASE_KEY       = service_role_key_here
 *    LINE_TOKEN         = channel_access_token_here
 *    LINE_GROUP_ID      = C1234567890abcdef1234567890abcdef
 *
 * 2. Run setupTriggers() ครั้งเดียวเพื่อสร้าง time-based trigger
 */

// ─── Config ──────────────────────────────────────────────────────────────────

function getConfig() {
  const props = PropertiesService.getScriptProperties()
  return {
    supabaseUrl: props.getProperty("SUPABASE_URL"),
    supabaseKey: props.getProperty("SUPABASE_KEY"),
    lineToken:   props.getProperty("LINE_TOKEN"),
    groupId:     props.getProperty("LINE_GROUP_ID"),
  }
}

// ─── Triggers ─────────────────────────────────────────────────────────────────

/** Run once to register all 3 daily triggers (ICT = UTC+7) */
function setupTriggers() {
  // Delete existing triggers first
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t))

  // Apps Script time triggers run in script timezone — set project TZ to Asia/Bangkok
  ScriptApp.newTrigger("report1130").timeBased().atHour(11).nearMinute(30).everyDays(1).create()
  ScriptApp.newTrigger("report1430").timeBased().atHour(14).nearMinute(30).everyDays(1).create()
  ScriptApp.newTrigger("report2230").timeBased().atHour(22).nearMinute(30).everyDays(1).create()

  Logger.log("Triggers created: 11:30, 14:30, 22:30")
}

function report1130() { sendReport("11:30") }
function report1430() { sendReport("14:30") }
function report2230() { sendReport("22:30") }

// ─── Core ─────────────────────────────────────────────────────────────────────

function sendReport(roundLabel) {
  const cfg = getConfig()

  // Query window: ย้อนหลัง 24 ชม. เพื่อนับ session ทั้งหมดของวันนี้
  const now = new Date()
  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  const rows = fetchAttendance(cfg, since.toISOString(), now.toISOString())
  const message = buildMessage(rows, roundLabel, now)

  pushLine(cfg, message)
  Logger.log("Sent report for " + roundLabel + " — " + rows.length + " sessions")
}

// ─── Supabase ─────────────────────────────────────────────────────────────────

function fetchAttendance(cfg, fromIso, toIso) {
  const url = cfg.supabaseUrl + "/rest/v1/hr_attendance" +
    "?select=check_in_at,check_out_at,work_hours,is_late,hr_employees(name)" +
    "&check_in_at=gte." + encodeURIComponent(fromIso) +
    "&check_in_at=lte." + encodeURIComponent(toIso) +
    "&order=check_in_at.asc"

  const res = UrlFetchApp.fetch(url, {
    headers: {
      "apikey": cfg.supabaseKey,
      "Authorization": "Bearer " + cfg.supabaseKey,
    },
    muteHttpExceptions: true,
  })

  if (res.getResponseCode() !== 200) {
    throw new Error("Supabase error: " + res.getContentText())
  }

  return JSON.parse(res.getContentText())
}

// ─── Format ───────────────────────────────────────────────────────────────────

function fmtTime(isoStr) {
  if (!isoStr) return "–"
  const d = new Date(isoStr)
  // Convert UTC → ICT (UTC+7)
  const ict = new Date(d.getTime() + 7 * 60 * 60 * 1000)
  const h = String(ict.getUTCHours()).padStart(2, "0")
  const m = String(ict.getUTCMinutes()).padStart(2, "0")
  return h + ":" + m
}

function fmtHours(workHours) {
  if (workHours == null) return "–"
  const h = Math.floor(workHours)
  const m = Math.round((workHours - h) * 60)
  return h + "ชม " + m + "น."
}

function todayICT(now) {
  const ict = new Date(now.getTime() + 7 * 60 * 60 * 1000)
  return ict.getUTCFullYear() + "/" +
    String(ict.getUTCMonth() + 1).padStart(2, "0") + "/" +
    String(ict.getUTCDate()).padStart(2, "0")
}

function buildMessage(rows, roundLabel, now) {
  const checkedIn  = rows.filter(r => r.check_in_at && !r.check_out_at)
  const checkedOut = rows.filter(r => r.check_in_at && r.check_out_at)
  const late       = rows.filter(r => r.is_late)

  const lines = [
    "📋 สรุปการเข้า-ออกงาน",
    "รอบ " + roundLabel + " | " + todayICT(now),
    "─────────────────────",
  ]

  lines.push("✅ เข้างานแล้ว: " + rows.length + " คน")
  lines.push("🔓 ยังอยู่ในรอบ: " + checkedIn.length + " คน")
  lines.push("🔒 ออกงานแล้ว: " + checkedOut.length + " คน")
  lines.push("⚠️ มาสาย: " + late.length + " คน")

  if (checkedIn.length > 0) {
    lines.push("")
    lines.push("🟢 กำลังทำงาน:")
    checkedIn.forEach(r => {
      const name = (r.hr_employees && r.hr_employees.name) || "–"
      lines.push("  • " + name + " (เข้า " + fmtTime(r.check_in_at) + ")")
    })
  }

  if (checkedOut.length > 0) {
    lines.push("")
    lines.push("⚪ ออกงานแล้ว:")
    checkedOut.forEach(r => {
      const name = (r.hr_employees && r.hr_employees.name) || "–"
      const lateTag = r.is_late ? " ⚠️สาย" : ""
      lines.push("  • " + name + lateTag +
        " (" + fmtTime(r.check_in_at) + "–" + fmtTime(r.check_out_at) + " | " + fmtHours(r.work_hours) + ")")
    })
  }

  if (rows.length === 0) {
    lines.push("")
    lines.push("ไม่มีข้อมูลการเข้างานในช่วงนี้")
  }

  return lines.join("\n")
}

// ─── LINE Push ────────────────────────────────────────────────────────────────

function pushLine(cfg, text) {
  UrlFetchApp.fetch("https://api.line.me/v2/bot/message/push", {
    method: "post",
    contentType: "application/json",
    headers: {
      "Authorization": "Bearer " + cfg.lineToken,
    },
    payload: JSON.stringify({
      to: cfg.groupId,
      messages: [{ type: "text", text: text }],
    }),
    muteHttpExceptions: true,
  })
}
