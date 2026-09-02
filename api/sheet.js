const axios = require('axios');

async function saveToGoogleSheet(userId, message) {

  const url = 'https://script.google.com/macros/s/AKfycbzvKN1sMklG3IAkQyzfw4cpBOwGY_174NkqGzWQX-sKuU8jCn8RQr20cUrQqYBcLOtWSQ/exec';

  await axios.post(url, {
    userId,
    message
  });

}

module.exports = {
  saveToGoogleSheet
};