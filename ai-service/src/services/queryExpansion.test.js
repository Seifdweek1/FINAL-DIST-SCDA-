const assert = require('assert');
const { expandSearchQueries, buildSearchSuggestions } = require('./queryExpansion.service');

function testEncryptionExpansion() {
  const variants = expandSearchQueries('How are files encrypted?');
  assert.ok(variants.length >= 2);
  const joined = variants.join(' ').toLowerCase();
  assert.ok(
    joined.includes('cryptograph') || joined.includes('cybersecurity') || joined.includes('data protection'),
    joined,
  );
}

function testSuggestions() {
  const seeds = buildSearchSuggestions('', 5);
  assert.ok(seeds.length >= 3);
  const enc = buildSearchSuggestions('encrypt', 6);
  assert.ok(enc.some((s) => s.text.toLowerCase().includes('encrypt')));
}

testEncryptionExpansion();
testSuggestions();
console.log('queryExpansion.test.js: all passed');
