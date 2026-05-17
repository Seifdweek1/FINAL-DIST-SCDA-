const bcrypt = require('bcrypt');

async function hashPassword(plain, rounds) {
  return bcrypt.hash(plain, rounds);
}

async function verifyPassword(plain, passwordHash) {
  return bcrypt.compare(plain, passwordHash);
}

module.exports = { hashPassword, verifyPassword };
