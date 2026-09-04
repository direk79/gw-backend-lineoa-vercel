'use strict';

const express = require('express');
const line = require('@line/bot-sdk');

const { config } = require('../config');
const { saveToGoogleSheet } = require('../services/googleSheetService');
const { pushMessage } = require('../services/lineService');

const router = express.Router();

// การตั้งค่าสำหรับ LINE middleware (ใช้ตรวจ signature ของ webhook)
const lineConfig = {
  channelAccessToken: config.line.channelAccessToken,
  channelSecret: config.line.channelSecret,
};

/**
 * ประมวลผล event หนึ่งรายการจาก LINE webhook
 * - รับเฉพาะข้อความ text ที่ขึ้นต้นด้วย "gid" (ไม่สนตัวพิมพ์เล็ก/ใหญ่)
 * - บันทึกลง Google Sheet แล้วแจ้งผลกลับผู้ใช้
 */
async function handleEvent(event) {
  const { type, source, message } = event;
  const userId = source?.userId;

  if (!userId) return;
  if (type !== 'message' || message?.type !== 'text') return;

  const text = message.text ? message.text.trim() : '';
  if (!text.toLowerCase().startsWith('gid')) return;

  try {
    const result = await saveToGoogleSheet(userId, text);
    console.log('Save Google Sheet Success');

    if (result && result.toString().trim() === 'OK') {
      await pushMessage(userId, '✅ ระบบได้รับข้อมูลของท่านเรียบร้อยแล้ว');
      console.log('Notify User Success');
    }
  } catch (apiErr) {
    console.error(
      'Save Google Sheet Error:',
      apiErr.response?.data || apiErr.message
    );
  }
}

/**
 * LINE Webhook endpoint
 * POST /api
 */
router.post('/', line.middleware(lineConfig), async (req, res) => {
  try {
    const events = req.body?.events;

    if (!Array.isArray(events) || events.length === 0) {
      return res
        .status(200)
        .json({ code: 200, result: 'success', message: 'No events' });
    }

    // ประมวลผลทุก event ให้เสร็จก่อนตอบกลับ
    // (ป้องกัน Vercel freeze/terminate process ก่อนงาน async จะจบ)
    for (const event of events) {
      await handleEvent(event);
    }

    return res.status(200).json({
      code: 200,
      result: 'success',
      message: 'Processed successfully',
    });
  } catch (error) {
    console.error('Webhook Unhandled Error:', error.message);
    if (!res.headersSent) {
      return res
        .status(500)
        .json({ code: 500, result: 'error', message: error.message });
    }
  }
});

module.exports = router;
