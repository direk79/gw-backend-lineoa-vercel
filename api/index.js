require('dotenv').config();
const express = require('express');
const line = require('@line/bot-sdk');
const axios = require('axios');
const https = require('https');

const app = express();

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
  channelSecret: process.env.LINE_CHANNEL_SECRET || '',
};

const httpsAgent = new https.Agent({ 
  rejectUnauthorized: false 
});

app.post('/api', line.middleware(config), async (req, res) => {
  try {
    const events = req.body?.events;
    console.warn("a-1");
    if (!Array.isArray(events) || events.length === 0) {
      return res.status(200).json({ code: 200, result: "success", message: "No events" });
    }
    console.warn("a-2");

    // 1. ตอบกลับ LINE ทันทีเพื่อป้องกันปัญหา LINE Webhook Timeout
    res.status(200).json({ code: 200, result: "success", message: "Processed successfully" });
    console.warn("a-3");
    // 2. ทำงานเบื้องหลัง (Background Process)
    for (const event of events) {
      const { type, source, message } = event;
      const userId = source?.userId;
      console.warn("a-4");
      if (!userId) continue;

      if (type === 'message' && message?.type === 'text') {
        const text = message.text ? message.text.trim() : '';
        console.warn("a-5");
        if (text.toLowerCase().startsWith('gid')) {
          try {
            console.warn("a-6");
            const apiUrl = "https://203.151.152.127/gwcenter/api/v1/servicelineoa/matchuserline/";
            console.warn(apiUrl);
            console.warn(userId);
            console.warn(text);
            console.warn("a-7");
            const response = await axios.post(apiUrl, {
              userId: userId,
              message: text
            }, {
              headers: { 'Content-Type': 'application/json' },
              timeout: 10000,
              httpsAgent: httpsAgent
            });
            console.warn("a-8");
            console.log('Call External API Success:', response.data);
          } catch (apiErr) {
            console.error('Call External API Error:', apiErr.response?.data || apiErr.message);
          }
        }
      }
    }

  } catch (error) {
    console.error('Webhook Unhandled Error:', error.message);
    if (!res.headersSent) {
      return res.status(500).json({ code: 500, result: "error", message: error.message });
    }
  }
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;