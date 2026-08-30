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

// Middleware ดักแยกระหว่าง LINE กับ Postman/Browser
const conditionalMiddleware = (req, res, next) => {
  if (req.headers['x-line-signature']) {
    return line.middleware(config)(req, res, next);
  }
  return express.json()(req, res, next);
};

app.post('/api', conditionalMiddleware, async (req, res) => {
  try {
    const events = req.body?.events;

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
          if (!BASE_URL) {
            console.error('BASE_URL is not defined in Environment Variables');
          } else {
            try {
              // ตัด slash ต่อท้าย BASE_URL ป้องกัน URL ซ้ำซ้อน (เช่น //gwcenter)
              const cleanBaseUrl = BASE_URL.replace(/\/+$/, '');
              await axios.post(`${cleanBaseUrl}/gwcenter/api/v1/servicelineoa/matchuserline/`, {
                userId: userId,
                message: text
              }, { timeout: 5000 });
            } catch (apiErr) {
              console.error('Call External API Error:', apiErr.response?.data || apiErr.message);
            }
          }
        }
      }
    }

    return res.status(200).json({ code: 200, result: "success", message: "Processed successfully", data: 0 });
  } catch (error) {
    console.error('Webhook Unhandled Error:', error.message);
    // ส่ง 200 กลับพร้อมข้อความ error เพื่อไม่ให้ Postman/LINE ได้รับ 500
    return res.status(200).json({ code: 500, result: "error", message: error.message });
  }
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;