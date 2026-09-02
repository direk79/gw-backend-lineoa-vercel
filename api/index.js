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

    // รันลูปให้จบก่อนส่ง Response กลับ (ป้องกัน Vercel Freeze Process)
    for (const event of events) {
      const { type, source, message } = event;
      const userId = source?.userId;
      console.warn("a-4");
      if (!userId) continue;

      if (type === 'message' && message?.type === 'text') {
        const text = message.text ? message.text.trim() : '';
        console.warn("a-5");
        
        // เช็กคำว่า gid แบบ Case-insensitive
        if (text.toLowerCase().startsWith('gid')) {
          try 
          {
            console.warn("a-6");
            console.warn(userId);
            console.warn(text);

            await saveToGoogleSheet(
              userId,
              text
            );

            console.warn("a-8");
            console.log('Save Google Sheet Success');                
          } catch (apiErr) {
            console.error('Save Google Sheet Error:', apiErr.response?.data || apiErr.message);
          }
        }
      }
    }

    // สั่ง Response 200 กลับไปหา LINE Webhook หลังจากยิง API สำเร็จแล้ว
    return res.status(200).json({ code: 200, result: "success", message: "Processed successfully" });

  } catch (error) {
    console.error('Webhook Unhandled Error:', error.message);
    if (!res.headersSent) {
      return res.status(500).json({ code: 500, result: "error", message: error.message });
    }
  }
});


async function saveToGoogleSheet(userId, message) {

  const url = 'https://script.google.com/macros/s/AKfycbzvKN1sMklG3IAkQyzfw4cpBOwGY_174NkqGzWQX-sKuU8jCn8RQr20cUrQqYBcLOtWSQ/exec';

  const response = await axios.post(url, {
    userId,
    message
  });

  console.log('Google Script Response:', response.data);
}

module.exports = {
  saveToGoogleSheet
};

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;