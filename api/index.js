require('dotenv').config();
const express = require('express');
const line = require('@line/bot-sdk');
const axios = require('axios');

const app = express();

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
  channelSecret: process.env.LINE_CHANNEL_SECRET || '',
};

const BASE_URL = process.env.BASE_URL;

// Middleware ดักแยกแยกระหว่าง LINE (มี Signature) กับ Browser/Postman (ไม่มี Signature)
const conditionalMiddleware = (req, res, next) => {
  if (req.headers['x-line-signature']) {
    // ถ้ามาจาก LINE ให้ใช้ line.middleware ตัวเดียว (มัน parse body ให้แล้ว)
    return line.middleware(config)(req, res, next);
  }
  // ถ้ายิงทดสอบทั่วไป ให้ใช้ express.json()
  return express.json()(req, res, next);
};

app.post('/api', conditionalMiddleware, async (req, res) => {
  try {
    const events = req.body?.events;

    // กรณี LINE กด Verify (events เป็น array ว่าง []) หรือรูปแบบไม่ใช่ array
    if (!Array.isArray(events)) {
      return res.status(200).json({ code: 200, result: "success", message: "No events or non-array" });
    }

    for (const event of events) {
      const { type, source, message } = event;
      const userId = source?.userId;

      if (!userId) continue;

      if (type === 'message' && message?.type === 'text') {
        const text = message.text ? message.text.trim() : '';

        if (text.toLowerCase().startsWith('gw')) {
          try {
            await axios.post(`${BASE_URL}/gwcenter/api/v1/servicelineoa/matchuserline/`, {
              userId: userId,
              message: text
            });
          } catch (apiErr) {
            console.error('Call External API Error:', apiErr.response?.data || apiErr.message);
          }
        }
      }
    }

    return res.status(200).json({ code: 200, result: "success", message: "", data: 0 });
  } catch (error) {
    console.error('Webhook Error:', error.message);
    return res.status(200).json({ code: 200, result: "error", message: error.message });
  }
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;