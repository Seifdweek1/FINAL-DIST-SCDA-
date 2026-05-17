const prisma = require('../prisma/client');

async function findByEmail(email) {
  return prisma.user.findUnique({
    where: { email },
  });
}

async function findPublicById(id) {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      role: true,
      created_at: true,
    },
  });
}

module.exports = { findByEmail, findPublicById };
