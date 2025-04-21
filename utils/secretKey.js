const crypto = require('crypto');

const SECRET_KEY = process.env.SECRET_KEY;

const hashKey = (text) => {
  return crypto
    .createHmac('sha256', SECRET_KEY)
    .update(text)
    .digest('hex');
};

const secureKey = (apiKey) => {
  const hash = hashKey(apiKey);
  return {
    hash,
    key: apiKey
  };
};

const verifyKey = (apiKey, storedHash) => {
  const computedHash = hashKey(apiKey);
  return computedHash === storedHash;
};

module.exports = {
  secureKey,
  verifyKey
}; 