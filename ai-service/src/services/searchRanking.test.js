const assert = require('assert');
const { rankSearchResults, computeKeywordScore } = require('./searchRanking.service');

const ENCRYPTION_PASSAGE =
  'Uploaded files are encrypted using AES-256-GCM before storage. Keys are managed per tenant.';

const COVER_GARBAGE =
  'Page 1 | Executive Risk Report\nJohn Smith Jane Doe Robert Lee %PDF-1.4 endobj stream';

const QUERY = 'How are files encrypted?';
const INTEGRITY_PASSAGE =
  'The system verifies file integrity using SHA-256 hash comparison. On upload the hash is stored with the ciphertext.';
const INTEGRITY_QUERY = 'How does the system verify file integrity?';

function testEncryptionRanksFirst() {
  const hits = [
    {
      id: 'cover',
      score: 0.92,
      payload: {
        chunk_index: 0,
        text_preview: COVER_GARBAGE,
        content: COVER_GARBAGE,
      },
    },
    {
      id: 'crypto',
      score: 0.71,
      payload: {
        chunk_index: 3,
        text_preview: ENCRYPTION_PASSAGE,
        content: ENCRYPTION_PASSAGE,
      },
    },
    {
      id: 'noise',
      score: 0.85,
      payload: {
        chunk_index: 1,
        text_preview:
          'The committee reviewed quarterly metrics and attendance. Names listed for reference only.',
        content:
          'The committee reviewed quarterly metrics and attendance. Names listed for reference only.',
      },
    },
  ];

  const ranked = rankSearchResults(hits, QUERY, 5);
  assert.strictEqual(ranked.length, 2, 'garbage cover should be filtered out');
  assert.strictEqual(ranked[0].id, 'crypto', 'encryption chunk must be first');
  assert.ok(
    ranked[0].payload.text_preview.includes('AES-256-GCM'),
    'preview should contain AES phrase',
  );
  assert.ok(!ranked[0].payload.text_preview.includes('\0'), 'preview must not contain NUL');
}

function testKeywordScoreBeatsBoilerplate() {
  const encScore = computeKeywordScore(QUERY, ENCRYPTION_PASSAGE, { chunk_index: 2 });
  const coverScore = computeKeywordScore(QUERY, COVER_GARBAGE, { chunk_index: 0 });
  assert.ok(encScore > coverScore, 'encryption passage keyword score should exceed cover');
}

function testNullPreviewFiltered() {
  const hits = [
    {
      id: 'bin',
      score: 0.99,
      payload: { text_preview: null, content: '%PDF-1.4\0\0endobj' },
    },
  ];
  const ranked = rankSearchResults(hits, QUERY, 5);
  assert.strictEqual(ranked.length, 0);
}

function testIntegrityRanksAboveEncryptionForIntegrityQuery() {
  const hits = [
    {
      id: 'crypto',
      score: 0.95,
      payload: {
        chunk_index: 1,
        text_preview: ENCRYPTION_PASSAGE,
        content: ENCRYPTION_PASSAGE,
      },
    },
    {
      id: 'integrity',
      score: 0.7,
      payload: {
        chunk_index: 2,
        text_preview: INTEGRITY_PASSAGE,
        content: INTEGRITY_PASSAGE,
      },
    },
  ];

  const ranked = rankSearchResults(hits, INTEGRITY_QUERY, 5);
  assert.strictEqual(ranked[0].id, 'integrity', 'integrity chunk must outrank encryption');
  assert.ok(ranked[0].payload.text_preview.includes('SHA-256'));
}

testEncryptionRanksFirst();
testKeywordScoreBeatsBoilerplate();
testNullPreviewFiltered();
testIntegrityRanksAboveEncryptionForIntegrityQuery();
console.log('searchRanking.test.js: all passed');
