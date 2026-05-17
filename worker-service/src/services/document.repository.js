const prisma = require('../prisma/client');

async function findDocument(documentId) {
  return prisma.document.findUnique({ where: { id: documentId } });
}

async function setStatus(documentId, status) {
  return prisma.document.update({
    where: { id: documentId },
    data: { status },
  });
}

module.exports = { findDocument, setStatus };
