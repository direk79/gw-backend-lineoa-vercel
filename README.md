# GW Backend LINE OA

Backend สำหรับ LINE Official Account ที่ทำหน้าที่รับ webhook จาก LINE เมื่อผู้ใช้ส่งข้อความ
แล้วบันทึกข้อมูลลง Google Sheet (ผ่าน Google Apps Script) จากนั้นแจ้งผลกลับไปหาผู้ใช้

Deploy บน **Vercel** ในรูปแบบ Serverless Function

---

## โครงสร้างโปรเจกต์

```
.
├── api/
│   └── index.js                 # Entry point (Vercel Serverless / local server)
├── src/
│   ├── app.js                   # สร้าง Express app + ผูก routes
│   ├── config/
│   │   └── index.js             # โหลด + ตรวจสอบ Environment Variables (จุดเดียว)
│   ├── routes/
│   │   └── webhook.js           # LINE webhook handler (POST /api)
│   └── services/
│       ├── lineService.js       # ส่งข้อความ push กลับผู้ใช้ผ่าน LINE API
│       └── googleSheetService.js# บันทึกข้อมูลลง Google Sheet ผ่าน Apps Script
├── .env.example                 # ตัวอย่างค่า Environment Variables
├── vercel.json                  # ตั้งค่า rewrite ให้ทุก request วิ่งเข้า /api
├── package.json
└── README.md
```

แนวคิดการแยกส่วน:
- **config** — รวมการอ่าน env ไว้ที่เดียว ไม่มี secret กระจายในโค้ด
- **routes** — จัดการ HTTP / รูปแบบ event ของ LINE
- **services** — ตรรกะการเรียกระบบภายนอก (LINE API, Google Sheet)
- **app / api** — ประกอบทุกอย่างเข้าด้วยกัน

---

## ความต้องการเบื้องต้น

- Node.js 18 ขึ้นไป
- บัญชี LINE Developers (Messaging API channel)
- Google Apps Script Web App ที่ deploy แล้ว (รับ POST `{ userId, message }`)
- (ถ้า deploy) บัญชี Vercel + Vercel CLI

---

## การติดตั้ง (Local)

```bash
# 1. ติดตั้ง dependencies
npm install

# 2. สร้างไฟล์ .env จากตัวอย่าง แล้วกรอกค่าจริง
cp .env.example .env    # Windows PowerShell: Copy-Item .env.example .env

# 3. รันเซิร์ฟเวอร์
npm run dev
```

เซิร์ฟเวอร์จะรันที่ `http://localhost:3002`
ตรวจสุขภาพระบบได้ที่ `GET http://localhost:3002/health`

---

## Environment Variables

| ชื่อ | จำเป็น | คำอธิบาย |
|------|:------:|----------|
| `LINE_CHANNEL_ACCESS_TOKEN` | ✅ | Channel Access Token จาก LINE Developers Console |
| `LINE_CHANNEL_SECRET` | ✅ | Channel Secret (ใช้ตรวจ signature ของ webhook) |
| `GOOGLE_SHEET_WEBHOOK_URL` | ✅ | URL ของ Google Apps Script Web App (`.../exec`) |
| `PORT` | ⬜ | พอร์ตของเซิร์ฟเวอร์ตอนรัน local (ดีฟอลต์ `3002`) |
| `NODE_ENV` | ⬜ | `development` หรือ `production` |

> ค่าเหล่านี้ **ห้าม** commit ลง git ไฟล์ `.env` และ `.env.*` ถูก ignore ไว้แล้ว
> ยกเว้น `.env.example` ที่เก็บเฉพาะค่าตัวอย่าง

---

## Deploy บน Vercel

1. ติดตั้ง Vercel CLI: `npm i -g vercel`
2. ตั้งค่า Environment Variables บน Vercel (Dashboard → Project → Settings → Environment Variables) ให้ครบตามตารางด้านบน
3. Deploy:
   ```bash
   vercel --prod
   ```
4. ตั้งค่า Webhook URL ใน LINE Developers Console ให้ชี้มาที่:
   ```
   https://<your-vercel-domain>/api
   ```
5. เปิดใช้งาน "Use webhook" และกด "Verify"

`vercel.json` ตั้ง rewrite ให้ทุก path วิ่งเข้าฟังก์ชัน `/api` (ซึ่ง export Express app)

---

## การทำงานโดยสรุป

1. ผู้ใช้ส่งข้อความในแชท LINE OA
2. LINE ยิง webhook มาที่ `POST /api`
3. ระบบตรวจ signature ด้วย `@line/bot-sdk` middleware
4. ถ้าข้อความเป็น text และขึ้นต้นด้วย `gid` (ไม่สนตัวพิมพ์เล็ก/ใหญ่) → บันทึกลง Google Sheet
5. ถ้า Apps Script ตอบ `OK` → ส่งข้อความยืนยันกลับหาผู้ใช้

ดูรายละเอียดเชิงลึกได้ที่ [docs/CODE_WALKTHROUGH.md](docs/CODE_WALKTHROUGH.md)

---

## ⚠️ หมายเหตุด้านความปลอดภัย

โค้ดเวอร์ชันก่อนหน้ามีการฝัง (hardcode) Channel Secret และ Channel Access Token ไว้ในไฟล์
`api/index.js` และถูก commit เข้า git history ไปแล้ว **ควร revoke/rotate คีย์เหล่านั้นทันที**
ดูขั้นตอนใน [docs/CODE_WALKTHROUGH.md](docs/CODE_WALKTHROUGH.md#security)
