'use strict';

const express = require('express');
const webhookRouter = require('./routes/webhook');

/**
 * สร้างและตั้งค่า Express application
 *
 * หมายเหตุ: ไม่ใส่ express.json() ครอบทั้งแอป เพราะ LINE middleware
 * ต้องอ่าน raw body เองเพื่อตรวจสอบ signature
 */
function createApp() {
  const app = express();

  // Health check endpoint (ใช้ตรวจสอบว่าเซิร์ฟเวอร์ทำงานอยู่)
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // LINE webhook (ต้องมาก่อน body parser อื่น ๆ)
  app.use('/api', webhookRouter);

  return app;
}

module.exports = { createApp };
