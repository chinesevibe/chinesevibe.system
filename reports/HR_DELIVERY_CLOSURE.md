# HR Delivery Closure — ส่งมอบครบ (เหลือ Payroll บาท onsite)

**Client goal:** 2026-06-12 — ปิด HR ครบที่ส่งมอบจริง → เหลือ **M39 Payroll บาท** ไปคุย HR + Accounting หน้างาน  
**Production:** https://hr-app-rho-blush.vercel.app  
**Target tag:** `hr-payroll-v1.1` (หลัง M38 sign-off)

---

## Scope ที่รวม (ไม่รวม Payroll บาท)

| Wave | Milestone | Tasks | สถานะ |
|------|-----------|-------|--------|
| **0** | Pending batch | Inventory T131–132, lint fix, nav | 🔜 commit + deploy |
| **1** | M38 partial | **T109** Nav + `/admin/report` | ✅ code ready → review |
| **2** | **M40** | **T121–T124** Portal v2 | 🔜 in progress |
| **3** | **M42** | **T129** Docs cleanup | 📋 after M40 |
| **4** | **M43** | **T134** Inbound + LIFF scan | ✅ done |
| **5** | **M38** | **T110–T114** E2E, security, sign-off | 📋 after wave 2–4 |
| — | ~~M41~~ | T125–T128 | ❌ cancelled |

**Out of closure:** M39 Payroll baht (T115–T120) — CR + onsite กับ Accounting

---

## Wave 1 — T109 ✅ (verify)

- [x] `ADMIN_NAV_GROUPS` 3 sections
- [x] `/admin/report` + redirects `/admin/reports`, `/admin/ceo`
- [x] CEO login → `/admin/report`
- [x] Inventory hub (real module, not placeholder)
- [ ] Cursor review + deploy

---

## Wave 2 — M40 Portal (T121–T124)

### T121 — Scope ✅ (locked in `PORTAL_ROADMAP.md`)

### T122 — Enable employee auth

- [ ] `canAccessEmployeePortal`: `employee` + `dev`
- [ ] `adminLoginPath`: active `employee` → `/portal`
- [ ] `/employee` → redirect active → `/portal`
- [ ] Portal layout: pending/inactive guards
- [ ] Security: employee cannot `/admin`

### T123 — Widgets + LIFF

- [x] Home widgets (attendance, leave, announcements)
- [ ] LIFF shortcuts incl. OT `/liff/overtime`
- [ ] Schedule page copy (no false Phase 10 promise)

### T124 — QA + handoff

- [ ] Mobile smoke `/portal/*`
- [ ] Update `CLIENT_HANDOFF_FINAL.md`

---

## Wave 3 — M42 (T129)

- [ ] Remove conflicting "LINE-only" / "no web dashboard" copy
- [ ] Document: **LINE + Portal** dual channel
- [ ] Do NOT remove `/portal`

---

## Wave 4 — Inventory T134

See `INVENTORY_ROADMAP.md` Phase 4 — inbound approve + stock + barcode LIFF

---

## Wave 5 — M38 Close-out (T110–T114)

See `orchestration/PHASE_12_PLAN.md`:

| Task | Deliverable |
|------|-------------|
| T110 | E2E register + OT 2-tier |
| T111 | `SECURITY_REVIEW_P7.md` |
| T112 | Client UAT fixes |
| T113 | `OPS_RUNBOOK_P12.md` |
| T114 | Client sign-off + tag `hr-payroll-v1.1` |

---

## Execution order (locked)

```
Deploy pending → T109 review → T122–124 → T129 → T134 → T110–114 → tag v1.1
```

---

*Orchestrator — 2026-06-12*
