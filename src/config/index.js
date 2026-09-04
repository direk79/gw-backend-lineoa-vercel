'use strict';

require('dotenv').config();

/**
 * รวมศูนย์การอ่านค่า Environment Variables ไว้ที่เดียว
 * และตรวจสอบความครบถ้วนของค่าที่จำเป็น (fail fast)
 */

function required(name) {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

function optional(name, fallback = '') {
  const value = process.env[name];
  return value && value.trim() !== '' ? value.trim() : fallback;
}

const config = {
  // การตั้งค่า LINE Messaging API
  line: {
    channelAccessToken: optional('LINE_CHANNEL_ACCESS_TOKEN'),
    channelSecret: optional('LINE_CHANNEL_SECRET'),
    pushApiUrl: 'https://api.line.me/v2/bot/message/push',
  },

  // ปลายทาง Google Apps Script สำหรับบันทึกข้อมูลลง Google Sheet
  googleSheet: {
    webhookUrl: optional('GOOGLE_SHEET_WEBHOOK_URL'),
  },

  // ค่าทั่วไปของเซิร์ฟเวอร์
  server: {
    port: Number(optional('PORT', '3002')),
    nodeEnv: optional('NODE_ENV', 'development'),
  },
};

/**
 * ตรวจสอบว่าค่าที่จำเป็นต่อการทำงานถูกตั้งครบหรือไม่
 * เรียกตอน start เพื่อให้ล้มเร็วถ้าตั้งค่าไม่ครบ
 */
function validateConfig() {
  const missing = [];
  if (!config.line.channelAccessToken) missing.push('LINE_CHANNEL_ACCESS_TOKEN');
  if (!config.line.channelSecret) missing.push('LINE_CHANNEL_SECRET');
  if (!config.googleSheet.webhookUrl) missing.push('GOOGLE_SHEET_WEBHOOK_URL');

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. ` +
        'โปรดตั้งค่าใน .env (local) หรือ Environment Variables ของ Vercel (production).'
    );
  }
}

module.exports = { config, validateConfig, required, optional };
