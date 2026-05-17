const prisma = require('../prisma/client');

async function deleteChunksForDocument(documentId) {
  return prisma.documentChunk.deleteMany({ where: { document_id: documentId } });
}

async function countChunksForDocument(documentId) {
  return prisma.documentChunk.count({ where: { document_id: documentId } });
}

async function insertChunks(rows) {
  if (!rows.length) return;
  await prisma.documentChunk.createMany({ data: rows });
}

module.exports = { deleteChunksForDocument, countChunksForDocument, insertChunks };
