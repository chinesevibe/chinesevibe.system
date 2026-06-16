# LINE OA — ข้อความต้อนรับ (Greeting)

อัปเดต: 2026-06-16

## 1. Webhook (Add Friend) — อัตโนมัติหลัง deploy

เมื่อผู้ใช้กด **เพิ่มเพื่อน** ระบบส่ง:

1. ข้อความต้อนรับ (ไทย+จีน + ลิงก์ `/register`)
2. รูปคู่มือลงทะเบียน 3 ภาษา (ไทย / จีน / พม่า)

Code: `src/lib/line/welcome-messages.ts` · handler: `src/lib/line/handlers/index.ts` (follow event)

รูปอยู่ที่: `public/line/register-guides/guide-{th,zh,my}.jpg`

---

## 2. LINE Official Account Manager — Greeting message (ตั้งมือ)

ไปที่ [LINE Official Account Manager](https://manager.line.biz/) → OA ของ CNV WorkHub → **ตอบกลอง消息 / Greeting message**

วางข้อความด้านล่าง (หรือเปิดใช้ **Webhook** สำหรับ greeting ถ้า LINE รองรับในแพ็กเกจของคุณ):

```
🐼 ยินดีต้อนรับสู่ CNV WorkHub
ทีม HR พร้อมดูแลและตอบทุกคำถามของคุณ

🕚 เปิดให้บริการ จันทร์–ศุกร์ เวลา 11.00–20.00 น.

欢迎来到 CNV WorkHub
我们的 HR 团队将竭诚为您服务，并解答您的各类问题。

服务时间： 周一至周五 11:00–20:00

🔗 ลิงก์ลงทะเบียนสำหรับพนักงานใหม่
(新员工注册链接)

https://hr-app-two-iota.vercel.app/register
```

**หมายเหตุ:** Greeting ใน Console แสดงเมื่อเปิดแชทครั้งแรก; **Follow webhook** ส่งเมื่อกดเพิ่มเพื่อน — ควรตั้งทั้งสองให้สอดคล้องกัน หรือปิด greeting ใน Console แล้วใช้ webhook อย่างเดียว

---

## 3. Deploy

หลัง merge ต้อง deploy production เพื่อให้รูปคู่มือโหลดได้จาก HTTPS:

```bash
cd hr-app && npx vercel --prod --yes
```

ตรวจ URL รูป:

- https://hr-app-two-iota.vercel.app/line/register-guides/guide-th.jpg
- https://hr-app-two-iota.vercel.app/line/register-guides/guide-zh.jpg
- https://hr-app-two-iota.vercel.app/line/register-guides/guide-my.jpg
