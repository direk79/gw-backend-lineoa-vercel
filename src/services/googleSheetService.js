'use strict';

const axios = require('axios');
const { config } = require('../config');

/**
 * ส่งข้อมูลของผู้ใช้ไปบันทึกที่ Google Sheet ผ่าน Google Apps Script Web App
 *
 * @param {string} userId  - LINE userId ของผู้ส่งข้อความ
 * @param {string} message - ข้อความที่ผู้ใช้พิมพ์เข้ามา
 * @returns {Promise<any>} - ข้อมูลที่ Apps Script ตอบกลับ (คาดหวังสตริง 'OK' เมื่อสำเร็จ)
 */
async function saveToGoogleSheet(userId, message) {
  const url = config.googleSheet.webhookUrl;

  const response = await axios.post(
    url,
    { userId, message },
    { timeout: 10000 }
  );

  console.log('Google Script Response:', response.data);
  return response.data;
}

module.exports = { saveToGoogleSheet };
