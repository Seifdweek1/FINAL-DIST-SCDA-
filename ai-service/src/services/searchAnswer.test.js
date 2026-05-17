const assert = require('assert');
const { buildSearchAnswer } = require('./searchAnswer.service');

const ENCRYPTION =
  'Uploaded files are encrypted using AES-256-GCM before storage. The platform uses microservices.';

const INTEGRITY =
  'The system verifies file integrity using SHA-256 hash comparison. On upload the hash is stored with the ciphertext.';

function testEncryptionAnswer() {
  const answer = buildSearchAnswer('How are files encrypted?', [
    {
      id: '1',
      score: 0.55,
      payload: { content: ENCRYPTION, text_preview: ENCRYPTION, chunk_index: 1 },
    },
  ]);
  assert.ok(answer.includes('AES-256-GCM'), answer);
  assert.ok(!answer.includes('No strong'), answer);
}

function testIntegrityAnswerWhenEncryptionRanksFirst() {
  const answer = buildSearchAnswer('How does the system verify file integrity?', [
    {
      id: 'enc',
      score: 1,
      payload: {
        content: ENCRYPTION,
        text_preview: ENCRYPTION,
        chunk_index: 1,
      },
    },
    {
      id: 'integrity',
      score: 0.72,
      payload: {
        content: INTEGRITY,
        text_preview: INTEGRITY,
        chunk_index: 2,
      },
    },
  ]);
  assert.strictEqual(
    answer,
    'The system verifies file integrity using SHA-256 hash comparison.',
    answer,
  );
}

function testWeakQuery() {
  const answer = buildSearchAnswer('What is the color of my car?', [
    {
      id: '2',
      score: 0.5,
      payload: {
        content: 'The system architecture uses microservices and PostgreSQL.',
        text_preview: 'The system architecture uses microservices and PostgreSQL.',
        chunk_index: 2,
      },
    },
  ]);
  assert.strictEqual(answer, 'No strong relevant result was found.');
}

testEncryptionAnswer();
testIntegrityAnswerWhenEncryptionRanksFirst();
testWeakQuery();
console.log('searchAnswer.test.js: all passed');
