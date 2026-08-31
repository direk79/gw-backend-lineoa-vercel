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
  console.warn("x-01-m");
  if (req.headers['x-line-signature']) {
    return line.middleware(config)(req, res, next);
  }
  return express.json()(req, res, next);
};

app.post('/api', conditionalMiddleware, async (req, res) => {
  try {
    console.warn("x-01");
    const events = req.body?.events;
    console.warn("x-02");
    if (!Array.isArray(events)) {
      return res.status(200).json({ code: 200, result: "success", message: "No events or non-array" });
    }
    console.warn("x-03");
    for (const event of events) {
      const { type, source, message } = event;
      const userId = source?.userId;

      if (!userId) continue;

      if (type === 'message' && message?.type === 'text') {
        const text = message.text ? message.text.trim() : '';
        console.warn("x-04");
        if (text.toLowerCase().startsWith('gid')) {
          if (!BASE_URL) {
            console.error('BASE_URL is not defined in Environment Variables');
          } else {
            try {
              // ตัด slash ต่อท้าย BASE_URL ป้องกัน URL ซ้ำซ้อน (เช่น //gwcenter)
              console.warn("x-05");
              console.warn(userId);
              console.warn(text);
              console.warn("x-05-2");
              // const cleanBaseUrl = BASE_URL.replace(/\/+$/, '');
              await axios.post(`https://203.151.152.127/gwcenter/api/v1/servicelineoa/matchuserline/`, {
                userId: userId,
                message: text
              }, { timeout: 5000 });
              console.warn("x-06");
            } catch (apiErr) {
              console.warn("x-07");
              console.error('Call External API Error:', apiErr.response?.data || apiErr.message);
            }
          }
        }
      }
    }
    console.warn("x-08");
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