const {

  cleanPassage,

  isReadablePassage,

  scorePassageForQuery,

  splitSentences,

} = require('../utils/textQuality');

const {

  extractPassageText,

  pickBestScoredPassage,

  computeQueryTermOverlap,

} = require('./searchRanking.service');



const NO_STRONG_ANSWER = 'No strong relevant result was found.';



/**

 * Pick the best 1–2 sentences from the top passage for a short natural-language answer.

 */

function extractConcisePassageAnswer(query, passage) {

  const text = cleanPassage(String(passage || ''), 0);

  if (!text || !isReadablePassage(text, { minLen: 20 })) return '';



  const sentences = splitSentences(text);

  if (!sentences.length) {

    return cleanPassage(text, 380);

  }



  const scored = sentences.map((sentence) => ({

    sentence,

    score: scorePassageForQuery(sentence, query),

  }));

  scored.sort((a, b) => b.score - a.score);



  const best = scored[0]?.sentence;

  if (best && scorePassageForQuery(best, query) >= 1) {

    return cleanPassage(best, 420);

  }



  if (scored[0]?.sentence) return cleanPassage(scored[0].sentence, 420);

  return cleanPassage(text, 380);

}



function formatDomainShortAnswer(query, passage) {

  const q = String(query || '').toLowerCase();

  const text = cleanPassage(String(passage || ''), 0);



  if (/\bintegrity|sha-?256|hash|verify\b/.test(q)) {

    if (/verifies file integrity using sha-?256 hash comparison/i.test(text)) {

      return 'The system verifies file integrity using SHA-256 hash comparison.';

    }

    for (const sentence of splitSentences(text)) {

      if (/sha-?256/i.test(sentence) && /\bintegrity|hash|compar|verify|recomput/i.test(sentence)) {

        if (/verifies file integrity|integrity using sha/i.test(sentence)) {

          return 'The system verifies file integrity using SHA-256 hash comparison.';

        }

        return cleanPassage(sentence, 420);

      }

    }

  }

  if (/\bencrypt|encryption|encrypted|cipher|aes\b/.test(q)) {
    for (const sentence of splitSentences(text)) {
      if (/aes-256-gcm/i.test(sentence) && /\bencrypt/i.test(sentence)) {
        return cleanPassage(sentence, 420);
      }
    }
    if (/uploaded files are encrypted using aes-256-gcm/i.test(text)) {
      return 'Uploaded files are encrypted using AES-256-GCM before storage.';
    }
  }

  if (/\baudit|logging|log trail|security event\b/.test(q)) {
    for (const sentence of splitSentences(text)) {
      if (
        /\baudit\b/i.test(sentence) &&
        /\blog|event|recorded|trail|service\b/i.test(sentence) &&
        scorePassageForQuery(sentence, query) >= 2
      ) {
        return cleanPassage(sentence, 450);
      }
    }
  }

  return extractConcisePassageAnswer(query, passage);

}



function assessSearchAnswerFromBest(query, best) {

  if (!best?.passage) return false;



  const q = String(query || '').toLowerCase();

  const pl = best.passage.toLowerCase();



  if (

    /\bintegrity|sha|hash|verify\b/.test(q) &&

    /sha-?256/.test(pl) &&

    /\bintegrity|hash|compar|verify|recomput/i.test(pl)

  ) {

    return true;

  }



  if (best.keywordScore >= 6) return true;

  if (best.termOverlap >= 0.25) return true;

  if (best.termOverlap >= 0.15 && best.keywordScore >= 4) return true;



  return false;

}



/**

 * Build short answer for GET /api/ai/search from ranked Qdrant hits.

 */

function buildSearchAnswer(query, results) {

  const q = String(query || '').trim();

  const hits = Array.isArray(results) ? results : [];



  if (!hits.length) {

    return NO_STRONG_ANSWER;

  }



  const best = pickBestScoredPassage(q, hits);

  if (!best || !assessSearchAnswerFromBest(q, best)) {

    return NO_STRONG_ANSWER;

  }



  const answer = formatDomainShortAnswer(q, best.passage);

  if (!answer) {

    return NO_STRONG_ANSWER;

  }



  const overlap = computeQueryTermOverlap(q, best.passage);

  if (overlap === 0 && scorePassageForQuery(best.passage, q) < 3) {

    return NO_STRONG_ANSWER;

  }



  return answer;

}



module.exports = {

  buildSearchAnswer,

  extractConcisePassageAnswer,

  formatDomainShortAnswer,

  NO_STRONG_ANSWER,

};


