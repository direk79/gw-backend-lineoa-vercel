'use strict';

// Entry point สำหรับ Vercel Serverless Function และรันแบบ local
const { createApp } = require('../src/app');
const { config, validateConfig } = require('../src/config');

const app = createApp();

// รันเป็นเซิร์ฟเวอร์ปกติเฉพาะตอน local (Vercel จะ import app โดยไม่ listen)
if (require.main === module) {
  try {
    validateConfig();
  } catch (err) {
    console.error('Config Error:', err.message);
    process.exit(1);
  }

  const PORT = config.server.port;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
