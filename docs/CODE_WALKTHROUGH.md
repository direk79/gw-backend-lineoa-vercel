# Code Walkthrough — GW Backend LINE OA

เอกสารนี้อธิบายการไหลของโค้ด (flow) ตั้งแต่ LINE ยิง webhook เข้ามา จนถึงการตอบกลับผู้ใช้
เพื่อให้ทีมไล่โค้ดและดูแลต่อได้ง่าย

---

## 1. ภาพรวมสถาปัตยกรรม

```
LINE Platform
     │  POST (webhook + signature)
     ▼
[vercel.json] rewrite ทุก path → /api
     ▼
api/index.js  ─────────────► src/app.js (createApp)
  (entry point)                   │
                                  │ app.use('/api', webhookRouter)
                                  ▼
                         src/routes/webhook.js
                                  │
              ┌───────────────────┴────────────────────┐
              ▼                                         ▼
   src/services/googleSheetService.js      src/services/lineService.js
   (บันทึกลง Google Sheet)                 (push ข้อความกลับผู้ใช้)
              │                                         │
              ▼                                         ▼
   Google Apps Script Web App                LINE Messaging API
```

การตั้งค่าทั้งหมด (env vars) ถูกอ่านผ่านจุดเดียวที่ `src/config/index.js`

---

## 2. Entry Point — `api/index.js`

ไฟล์นี้ทำหน้าที่บาง ๆ แค่ประกอบและสตาร์ท:

```js
const { createApp } = require('../src/app');
const { config, validateConfig } = require('../src/config');

const app = createApp();

if (require.main === module) {   // รันตรง ๆ (local) เท่านั้น
  validateConfig();              // ล้มเร็วถ้าตั้ง env ไม่ครบ
  app.listen(config.server.port, ...);
}

module.exports = app;            // Vercel import ตัว app ไปใช้ (ไม่ listen เอง)
```

จุดสำคัญ:
- **`require.main === module`** — แยกพฤติกรรมระหว่างรัน local (`node api/index.js` → `listen`)
  กับบน Vercel (import `app` เป็น handler เฉย ๆ ไม่เปิดพอร์ต)
- **`validateConfig()`** — ตรวจว่ามี env ครบก่อนเปิดเซิร์ฟเวอร์

---

## 3. การตั้งค่า — `src/config/index.js`

- โหลด `.env` ด้วย `dotenv`
- รวมค่าทั้งหมดไว้ในออบเจ็กต์ `config` (line / googleSheet / server)
- `validateConfig()` ตรวจว่ามี 3 ค่าที่จำเป็น: `LINE_CHANNEL_ACCESS_TOKEN`,
  `LINE_CHANNEL_SECRET`, `GOOGLE_SHEET_WEBHOOK_URL` — ถ้าขาดจะ throw พร้อมบอกว่าขาดตัวไหน

ประโยชน์: ไม่มี secret หรือ magic string กระจายอยู่ตามไฟล์ ทุกอย่างมาจากที่เดียว

---

## 4. การประกอบแอป — `src/app.js`

```js
function createApp() {
  const app = express();
  app.get('/health', ...);            // health check
  app.use('/api', webhookRouter);     // webhook
  return app;
}
```

> **สำคัญ:** ไม่ใส่ `express.json()` ครอบทั้งแอป เพราะ LINE middleware ต้องอ่าน **raw body**
> เพื่อคำนวณและเทียบ signature ถ้า parse JSON ไปก่อน จะทำให้ตรวจ signature ไม่ผ่าน

---

## 5. หัวใจของระบบ — `src/routes/webhook.js`

### 5.1 LINE middleware
```js
router.post('/', line.middleware(lineConfig), async (req, res) => { ... });
```
`line.middleware` จะ:
1. อ่าน raw body
2. ตรวจ `x-line-signature` เทียบกับ `channelSecret`
3. ถ้าผ่าน จึง parse `req.body` ให้ ถ้าไม่ผ่านจะโยน error (กัน request ปลอม)

### 5.2 การวนประมวลผล event
```js
const events = req.body?.events;
if (!Array.isArray(events) || events.length === 0) {
  return res.status(200).json({ ... "No events" });
}
for (const event of events) {
  await handleEvent(event);   // await ให้จบก่อนตอบกลับ
}
return res.status(200).json({ ... "Processed successfully" });
```

> **ทำไมต้อง `await` ให้จบก่อนส่ง response?**
> บน Vercel (serverless) เมื่อส่ง response แล้ว process อาจถูก freeze/terminate ทันที
> ถ้าปล่อยงาน async ค้างไว้หลัง response งานอาจไม่ทำงานจนจบ

### 5.3 ตรรกะต่อ 1 event — `handleEvent`
เงื่อนไขการรับข้อความ (ข้ามถ้าไม่เข้าเงื่อนไข):
1. ต้องมี `source.userId`
2. ต้องเป็น `type === 'message'` และ `message.type === 'text'`
3. ข้อความ (trim แล้ว) ต้องขึ้นต้นด้วย `gid` แบบไม่สนตัวพิมพ์เล็ก/ใหญ่

เมื่อผ่านเงื่อนไข:
```js
const result = await saveToGoogleSheet(userId, text);
if (result?.toString().trim() === 'OK') {
  await pushMessage(userId, '✅ ระบบได้รับข้อมูลของท่านเรียบร้อยแล้ว');
}
```
error ระหว่างเรียก API ถูก `catch` เฉพาะในตัว event เพื่อไม่ให้ event เดียวพังทั้ง batch

---

## 6. Services

### 6.1 `googleSheetService.saveToGoogleSheet(userId, message)`
- POST `{ userId, message }` ไปที่ `config.googleSheet.webhookUrl`
- มี timeout 10 วินาที
- คืนค่า `response.data` (คาดหวัง `'OK'` เมื่อสำเร็จ)

### 6.2 `lineService.pushMessage(userId, message)`
- POST ไปที่ LINE Push API (`https://api.line.me/v2/bot/message/push`)
- ใส่ `Authorization: Bearer <channelAccessToken>`
- คืน `true` เมื่อสำเร็จ; ถ้า error จะ log แล้ว throw ต่อ

---

## 7. ลำดับการทำงานแบบ end-to-end

1. ผู้ใช้พิมพ์ `gid12345` ในแชท LINE OA
2. LINE POST webhook → Vercel rewrite → `api/index.js` → `app` → `POST /api`
3. `line.middleware` ตรวจ signature ผ่าน
4. วน events → `handleEvent`
5. ข้อความขึ้นต้น `gid` → `saveToGoogleSheet(userId, "gid12345")`
6. Apps Script บันทึกแถวใหม่แล้วตอบ `OK`
7. `pushMessage` ส่ง "✅ ระบบได้รับข้อมูลของท่านเรียบร้อยแล้ว" กลับผู้ใช้
8. ตอบ HTTP 200 กลับ LINE

---

## 8. Security {#security}

### สิ่งที่ปรับแล้วในการรื้อครั้งนี้
- ลบ `dataSecret` ที่ hardcode Channel Secret / Access Token ออกจาก `api/index.js`
- ย้าย Google Apps Script URL ไปเป็น env (`GOOGLE_SHEET_WEBHOOK_URL`)
- secret ทั้งหมดอ่านจาก env ผ่าน `src/config` เท่านั้น
- `.gitignore` ครอบ `.env` และ `.env.*` (ยกเว้น `.env.example`)

### สิ่งที่ต้องทำต่อ (สำคัญ)
คีย์ต่อไปนี้เคยถูก commit เข้า git history จึงถือว่า **รั่วแล้ว** ควรจัดการทันที:

| คีย์ | ทำอะไร |
|------|--------|
| LINE Channel Access Token | ออกใหม่ (reissue) ใน LINE Developers Console แล้วอัปเดต env |
| LINE Channel Secret | ถ้า reissue ได้ควร reissue; อย่างน้อยตรวจการใช้งานผิดปกติ |
| Google Apps Script URL | สร้าง deployment ใหม่ให้ได้ URL ใหม่ แล้วปิด/ลบตัวเก่า |
| VERCEL_OIDC_TOKEN (`.env.local`) | เป็น token ชั่วคราวที่ Vercel CLI สร้าง จะหมดอายุเอง ไม่ต้อง commit |

> การลบ secret ออกจากโค้ดปัจจุบันไม่ได้ลบออกจาก **git history**
> ถ้าต้องการล้างประวัติจริง ต้องใช้เครื่องมืออย่าง `git filter-repo` หรือ BFG
> แต่วิธีที่ปลอดภัยและง่ายกว่าคือ **rotate คีย์** ตามตารางด้านบน เพราะคีย์เก่าจะใช้ไม่ได้อีก
