# LINE OA — ข้อความต้อนรับ (Greeting)

อัปเดต: 2026-06-16

## สรุป

| ช่องทาง | ทำงานเมื่อ | เนื้อหา |
|---------|-----------|---------|
| **Webhook (follow)** | เพิ่มเพื่อน / unblock | ข้อความ + รูป 3 ภาษา (อัตโนมัติ) |
| **Console Greeting** | เพิ่มเพื่อน / unblock | ตั้งมือใน manager.line.biz |
| **Postback `welcome`** | กดปุ่ม Rich Menu (ถ้ามี) | ข้อความ + รูป |

LINE **ไม่มี API** ตั้ง Greeting ใน Console — ต้อง login [manager.line.biz](https://manager.line.biz/)

---

## ตั้ง Console อย่างเร็ว

```bash
cd hr-app && node scripts/line-oa-greeting-setup.mjs
```

สคริปต์จะ:
- ตรวจ webhook + ชื่อ bot
- แสดงข้อความให้ copy
- เปิด LINE Official Account Manager ในเบราว์เซอร์

ข้อความสำเร็จรูป: `scripts/line-oa-greeting-text.txt`

### ขั้นตอนใน Console

1. **Settings → Response settings**
   - Response mode: **Webhook**
   - เปิด **Use webhook**
   - ปิด **Auto-response message**
2. **Greeting message** (เมนูซ้าย)
   - เปิดใช้งาน
   - วางข้อความจากสคริปต์ → **Save**
3. (Optional) แนบรูปใน Console จาก URL:
   - `https://hr-app-two-iota.vercel.app/line/register-guides/guide-th.jpg`
   - `.../guide-zh.jpg`
   - `.../guide-my.jpg`

---

## ไม่ให้ข้อความซ้ำ (Console + Webhook)

ถ้าเปิด Greeting ใน Console **และ** webhook ส่งข้อความ → ลูกค้าได้ข้อความ 2 ชุด

**แก้:** ตั้ง Vercel env แล้ว redeploy:

```text
LINE_OA_GREETING_IMAGES_ONLY=true
```

Webhook จะส่ง **เฉพาะรูป 3 ภาษา** หลัง add friend (ข้อความมาจาก Console)

---

## Code

| ไฟล์ | หน้าที่ |
|------|--------|
| `src/lib/line/welcome-messages.ts` | ข้อความ + URL รูป |
| `src/lib/line/handlers/index.ts` | follow event |
| `src/lib/line/handlers/actions/welcome.ts` | postback `action=welcome` |

---

## Deploy

รูปต้องอยู่บน HTTPS production:

```bash
cd hr-app && npx vercel --prod --yes
```
