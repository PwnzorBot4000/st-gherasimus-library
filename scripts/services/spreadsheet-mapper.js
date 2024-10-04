import {normalize, tokenize} from "../utils.js";

export class SpreadsheetMapper {
  // Standard header map
  // Deterministic way to map headers to keys
  static headerMap = {
    'ΑΑ': 'index',
    'ΑΝΑΓΝΩΣΤΗΡΙΟ': 'isReadingRoom',
    'ΑΝΤΙΤΥΠΑ': 'numCopies',
    'ΑΡΙΘΜΟΣΕΙΣΑΓΩΓΗΣ': 'entryId',
    'ΔΑΝΕΙΣΤΙΚΗ': 'isLibrary',
    'ΕΚΔΟΤΗΣ': 'publisher',
    'ΕΚΘΕΣΗ': 'isExpo',
    'ΗΜΕΡΟΜΗΝΙΑ': 'entryDate',
    'ΚΑΤ1': 'codeC1',
    'ΚΑΤ2': 'codeC2',
    'ΚΑΤ3': 'codeC3',
    'ΚΑΤ4': 'codeC4',
    'ΚΩΔΙΚΟΣ': 'code',
    'ΠΕΡΙΓΡΑΦΗ': 'description',
    'ΣΥΓΓΡΑΦΕΑΣ': 'author',
    'ΤΙΤΛΟΣ': 'title',
    'ΧΡΟΝΟΛΟΓΙΑ': 'year',
  };

  // Expected header order
  // Heuristic method to map headers not in the standard map
  static standardHeaderOrder = [
    { keys: ['AA'], mappedKey: 'index', regex: /^[0-9]+$/ },
    { keys: ['ΑΡΙΘΜΟΣΕΙΣΑΓΩΓΗΣ'], mappedKey: 'entryId', regex: /^[0-9]+$/ },
    { keys: ['ΗΜΕΡΟΜΗΝΙΑ'], mappedKey: 'entryDate', validator: (v) => (v instanceof Date) || /^[0-9]{1,2}\/[0-9]{1,2}\/[0-9]{4}$/.test(v) },
    { keys: ['ΤΙΤΛΟΣ'], mappedKey: 'title', score: (v) => Math.min(tokenize(v).length, 8) }, // Title usually has lots of words
    { keys: ['ΣΥΓΓΡΑΦΕΑΣ'], mappedKey: 'author', score: (v) => {
        switch (tokenize(v).length) {
          case 1: return 0.5;
          case 2: return 1.5;
          case 3: return 0.75;
          default: return 0;
        }
      } }, // Author usually has 2-3 words
    { keys: ['ΕΚΔΟΤΗΣ'], mappedKey: 'publisher', score: (v) => {
        switch (tokenize(v).length) {
          case 1: return 1.5;
          case 2: return 1;
          case 3: return 0.33;
          default: return 0;
        }
      } }, // Publisher usually has 1 word, max 2-3 words
    { keys: ['ΕΚΔΟΤΕΣ'], mappedKey: 'publishers', optional: true, score: (v) => {
        switch (tokenize(v).length) {
          case 1: return 1.5;
          case 2: return 1;
          case 3: return 0.33;
          default: return 0;
        }
      } },
    { keys: ['ΧΡΟΝΟΛΟΓΙΑ'], mappedKey: 'year', regex: /^[0-9]{4}$/ },
    { keys: ['ΑΝΤΙΤΥΠΑ'], mappedKey: 'numCopies', regex: /^[0-9]$/ },
    { keys: ['ΚΩΔΙΚΟΣ'], mappedKey: 'code', regex: /^[0-9]{1,2}[Α-Ω]{1,2}[α-ω]{1,2}[0-9]{1,3}$/ },
    { keys: ['ΚΑΤ1'], mappedKey: 'codeC1', regex: /^[0-9]{1,2}$/ },
    { keys: ['ΚΑΤ2'], mappedKey: 'codeC2', regex: /^[Α-Ω]{1,2}$/ },
    { keys: ['ΚΑΤ3'], mappedKey: 'codeC3', regex: /^[α-ω]{1,2}$/ },
    { keys: ['ΚΑΤ4'], mappedKey: 'codeC4', regex: /^[0-9]{1,3}$/ },
    { keys: ['ΔΑΝΕΙΣΤΙΚΗ'], mappedKey: 'isLibrary', regex: /^Δ$/ },
    { keys: ['ΕΚΘΕΣΗ'], mappedKey: 'isExpo', regex: /^Ε$/ },
    { keys: ['ΑΝΑΓΝΩΣΤΗΡΙΟ'], mappedKey: 'isReadingRoom', regex: /^Α$/ },
    { keys: ['ΠΕΡΙΓΡΑΦΗ'], mappedKey: 'description', score: (v) => (Math.max(tokenize(v).length - 5, 0) / 5) },
  ];

  // Determine header mapping
  mapHeaders(headers, data) {
    const mappedHeaders = headers.map((header) => {
      const normalizedHeader = normalize(header);
      const normalizedHeader2 = normalizedHeader?.replace(/ /g, '');
      const standardHeader = SpreadsheetMapper.headerMap[normalizedHeader2];
      return {
        origKey: header,
        normKey: normalizedHeader,
        normKey2: normalizedHeader2,
        mappedKey: standardHeader
      };
    });

    // Fill gaps in the header array
    for (let i = 0; i < mappedHeaders.length; i++) {
      if (mappedHeaders[i]) continue;
      mappedHeaders[i] = { origKey: undefined, normKey: undefined, normKey2: undefined, mappedKey: undefined };
    }

    // FIXME: We take the dangerous assumption that the user supplies the correct headers
    //   without checking the data for compatibility.

    // Find next / prev mapped header
    for (let i = 0; i < mappedHeaders.length; i++) {
      if (mappedHeaders[i].mappedKey) continue;
      let j = 1;
      while (i + j < mappedHeaders.length) {
        if (mappedHeaders[i + j].mappedKey) {
          mappedHeaders[i].nextMappedKey = mappedHeaders[i + j].mappedKey;
          break;
        }
        j++;
      }
      mappedHeaders[i].nextMappedPos = j;
      j = -1;
      while (i + j >= 0) {
        if (mappedHeaders[i + j].mappedKey) {
          mappedHeaders[i].prevMappedKey = mappedHeaders[i + j].mappedKey;
          break;
        }
        j--;
      }
      mappedHeaders[i].prevMappedPos = j;
    }

    const unmappedHeaders = mappedHeaders.filter((header) => !header.mappedKey);

    // Find suspected header mapping from position
    for (const header of unmappedHeaders) {
      // Simple case: unknown header is between 2 known headers.
      if (header.nextMappedKey && header.prevMappedKey) {
        const nextStandardHeader = SpreadsheetMapper.standardHeaderOrder.find((h) => h.mappedKey === header.nextMappedKey);
        const prevStandardHeader = SpreadsheetMapper.standardHeaderOrder.find((h) => h.mappedKey === header.prevMappedKey);
        if (nextStandardHeader && prevStandardHeader) {
          const nextStandardHeaderIndex = SpreadsheetMapper.standardHeaderOrder.indexOf(nextStandardHeader);
          const prevStandardHeaderIndex = SpreadsheetMapper.standardHeaderOrder.indexOf(prevStandardHeader);
          // Check if the actual headers are in the expected positions (and distances)
          if (nextStandardHeaderIndex - prevStandardHeaderIndex === header.nextMappedPos - header.prevMappedPos) {
            // Found
            header.suspectedKey = SpreadsheetMapper.standardHeaderOrder[nextStandardHeaderIndex - header.nextMappedPos].mappedKey;
          }
          // Else, case 1: there are more unknown headers than expected, between the mapped headers
          // case 2: there is a known header missing between the mapped headers (not handled in this loop)
        }
      }
    }

    // Confirm suspected headers by checking the data
    const suspectedHeaders = unmappedHeaders.filter((header) => header.suspectedKey);
    for (const [index, header] of mappedHeaders.entries()) {
      if (!header.suspectedKey) continue;
      const suspectedKey = header.suspectedKey;
      const candidateHeader = SpreadsheetMapper.standardHeaderOrder.find((h) => h.mappedKey === suspectedKey);
      if (!candidateHeader) continue;
      const nonEmptyValues = data.map((row) => row[index]).filter((v) => (v?.toString()?.trim?.()?.length ?? 0) > 0);
      // Special case: The whole column is empty
      if (nonEmptyValues.length === 0) {
        header.mappedKey = 'ignore';
        continue;
      }
      // Confirm the data. We need a strict 95% match of all non-empty values.
      let score = 0;
      for (const value of nonEmptyValues) {
        if (candidateHeader.regex) {
          if (candidateHeader.regex.test(value)) score++;
        } else if (candidateHeader.validator) {
          if (candidateHeader.validator(value)) score++;
        } else if (candidateHeader.score) {
          score += candidateHeader.score(value);
        }
      }
      score /= nonEmptyValues.length;
      if (score > 0.95) {
        header.mappedKey = suspectedKey;
      }
    }

    // Try to match the remaining headers with best fit
    // Data matching is done by score. The score has to be exceptional in comparison to other headers to match.
    // const notFoundStandardHeaders = standardHeaderOrder
    //   .filter((header) => !mappedHeaders.some((mappedHeader) => mappedHeader.mappedKey === header.mappedKey));
    // TODO: match remaining headers with best fit

    // TODO: report unmapped headers

    return mappedHeaders.map((header) => header.mappedKey ?? header.normKey);
  }
}