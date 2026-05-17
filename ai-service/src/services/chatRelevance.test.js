const assert = require('assert');
const { assessChatDocumentRelevance, buildNoRelevantContextReply } = require('./chatRelevance.service');

const ARCHITECTURE =
  'The system architecture uses microservices. PostgreSQL stores metadata. Nginx routes API traffic.';

const QUERY = 'what is the color of my car';

function testIrrelevantDespiteHits() {
  const assessment = assessChatDocumentRelevance({
    query: QUERY,
    hits: [
      {
        id: '1',
        score: 0.42,
        payload: {
          chunk_index: 2,
          content: ARCHITECTURE,
          text_preview: ARCHITECTURE,
        },
      },
    ],
    plainPassages: [],
  });
  assert.strictEqual(assessment.relevant, false);
  assert.ok(
    ['no_term_overlap', 'low_keyword_overlap'].includes(assessment.reason),
    `expected overlap failure, got ${assessment.reason}`,
  );
}

function testRelevantEncryptionPassage() {
  const passage =
    'Uploaded files are encrypted using AES-256-GCM before storage. Keys are rotated per tenant.';
  const assessment = assessChatDocumentRelevance({
    query: 'How are files encrypted?',
    hits: [
      {
        id: '2',
        score: 0.2,
        payload: { content: passage, text_preview: passage, chunk_index: 1 },
      },
    ],
    plainPassages: [],
  });
  assert.strictEqual(assessment.relevant, true);
}

function testLowVectorScore() {
  const assessment = assessChatDocumentRelevance({
    query: 'encryption at rest',
    hits: [
      {
        id: '3',
        score: 0.05,
        payload: {
          content: 'Uploaded files are encrypted using AES-256-GCM before storage.',
          text_preview: 'Uploaded files are encrypted using AES-256-GCM before storage.',
        },
      },
    ],
    plainPassages: [],
  });
  assert.strictEqual(assessment.relevant, false);
  assert.strictEqual(assessment.reason, 'low_vector_score');
}

function testSummarizeWithPlainChunks() {
  const passage =
    'Security Report Secure Compliance Document Assistant (SCDA). This sample report is designed for testing document upload, encryption, integrity verification.';
  const assessment = assessChatDocumentRelevance({
    query: 'summarize the document',
    hits: [
      {
        id: 'sql',
        score: 0.08,
        payload: {
          content: 'CREATE EXTENSION IF NOT EXISTS pgcrypto;',
          text_preview: 'CREATE EXTENSION IF NOT EXISTS pgcrypto;',
          metadata: { source: 'chat-auto-index' },
        },
      },
    ],
    plainPassages: [passage],
  });
  assert.strictEqual(assessment.relevant, true, JSON.stringify(assessment));
}

function testReplyFormat() {
  const msg = buildNoRelevantContextReply('Security_Report.pdf');
  assert.ok(msg.includes('Security_Report.pdf'));
  assert.ok(msg.includes('could not find enough relevant information'));
}

testIrrelevantDespiteHits();
testRelevantEncryptionPassage();
testLowVectorScore();
testSummarizeWithPlainChunks();
testReplyFormat();
console.log('chatRelevance.test.js: all passed');
