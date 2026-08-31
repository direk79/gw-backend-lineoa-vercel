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

// ใช้ middleware ของ LINE โดยตรง (LINE SDK จะ parse body ให้อัตโนมัติอยู่แล้ว)
app.post('/api', line.middleware(config), async (req, res) => {
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
          try {
            console.warn("x-05");
            let cleanBaseUrl = "https://203.151.152.127/gwcenter/api/v1/servicelineoa/matchuserline/";
            
            await axios.post(cleanBaseUrl, {
              userId: userId,
              message: text
            }, { 
              timeout: 5000,
              httpsAgent: httpsAgent 
            });
            
            console.warn("x-06");
          } catch (apiErr) {
            console.warn("x-07");
            console.error('Call External API Error:', apiErr.response?.data || apiErr.message);
          }
        }
      }
    }
    console.warn("x-08");
    return res.status(200).json({ code: 200, result: "success", message: "Processed successfully", data: 0 });
  } catch (error) {
    console.error('Webhook Unhandled Error:', error.message);
    return res.status(200).json({ code: 500, result: "error", message: error.message });
  }
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;