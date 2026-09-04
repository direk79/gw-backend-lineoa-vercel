'use strict';

const axios = require('axios');
const { config } = require('../config');

/**
 * ส่งข้อความแบบ Push กลับไปหาผู้ใช้ผ่าน LINE Messaging API
 *
 * @param {string} userId  - LINE userId ปลายทาง
 * @param {string} message - ข้อความที่ต้องการส่ง
 * @returns {Promise<boolean>} - true เมื่อส่งสำเร็จ
 */
async function pushMessage(userId, message) {
  try {
    await axios.post(
      config.line.pushApiUrl,
      {
        to: userId,
        messages: [{ type: 'text', text: message }],
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.line.channelAccessToken}`,
        },
        timeout: 10000,
      }
    );

    return true;
  } catch (error) {
    console.error('LINE Push Error:', error.response?.data || error.message);
    throw error;
  }
}

module.exports = { pushMessage };
