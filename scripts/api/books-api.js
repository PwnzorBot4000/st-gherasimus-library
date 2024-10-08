import {normalize, splitCode } from "../utils.js";
import {SpreadsheetMapper} from "../services/spreadsheet-mapper.js";

export class BooksApi {
  async init() {
    this.spreadsheetMapper = services.get('spreadsheetMapper');
    await this.loadBooksData();
  }

  async estimateTerminalLocation() {
    const libraryCounts = this.booksData.reduce((acc, book) => {
      if (book.libraryId === 'library') acc.library++;
      if (book.libraryId === 'expo') acc.expo++;
      if (book.libraryId === 'reading-room') acc.readingRoom++;
      return acc;
    }, { library: 0, expo: 0, readingRoom: 0 });

    // To be sure which library is the app used for, we take the library with the most books.
    if (libraryCounts.library >= libraryCounts.expo && libraryCounts.library >= libraryCounts.readingRoom) return 'library';
    if (libraryCounts.expo >= libraryCounts.library && libraryCounts.expo >= libraryCounts.readingRoom) return 'expo';
    return 'reading-room';
  }

  async exportData() {
    const headers = SpreadsheetMapper.standardHeaderOrder.map((header) => header.name);
    const rows = this.booksData.map((book, index) => {
      const bookCodeParts = splitCode(book.code);
      return SpreadsheetMapper.standardHeaderOrder.map((header) => {
        switch (header.mappedKey) {
          case 'index':
            return index + 1;
          case 'isLibrary':
            return book.libraryId === 'library' ? 'Δ' : '';
          case 'isExpo':
            return book.libraryId === 'expo' ? 'Ε' : '';
          case 'isReadingRoom':
            return book.libraryId === 'reading-room' ? 'Α' : '';
          case 'codeC1':
            return bookCodeParts?.[0] ?? '';
          case 'codeC2':
            return bookCodeParts?.[1] ?? '';
          case 'codeC3':
            return bookCodeParts?.[2] ?? '';
          case 'codeC4':
            return bookCodeParts?.[3] ?? '';
          default:
            const value = book[header.mappedKey];
            return value ?? '';
        }
      });
    });

    return {headers, rows};
  }

  async hasData() {
    return this.booksData.length > 0;
  }

  async importData(data, headers) {
    const ignoredHeaders = ['index', 'ignore'];
    const mappedHeaders = this.spreadsheetMapper.mapHeaders(headers, data);

    for (const [index, header] of mappedHeaders.entries()) {
      if (!header) {
        console.error(`Could not map header ${headers[index]}`);
        return;
      }
    }

    const mappedData = data.map((row) => {
      const mappedBook = {};

      for (const [columnIndex, value] of row.entries()) {
        const header = mappedHeaders[columnIndex];
        if (ignoredHeaders.includes(header)) continue;

        mappedBook[header] = value;
      }

      // Convert libraryId
      if (mappedBook.hasOwnProperty('isLibrary')) {
        if (mappedBook['isLibrary'] === 'Δ') {
          mappedBook['libraryId'] = 'library';
        }
        delete mappedBook['isLibrary'];
      }
      if (mappedBook.hasOwnProperty('isExpo')) {
        if (mappedBook['isExpo'] === 'Ε') {
          // TODO: handle libraryId already set
          mappedBook['libraryId'] = 'expo';
        }
        delete mappedBook['isExpo'];
      }
      if (mappedBook.hasOwnProperty('isReadingRoom')) {
        if (mappedBook['isReadingRoom'] === 'Α') {
          // TODO: handle libraryId already set
          mappedBook['libraryId'] = 'reading-room';
        }
        delete mappedBook['isReadingRoom'];
      }

      // TODO: Convert code better
      const codeParts = splitCode(mappedBook.code) ??
        [mappedBook['codeC1'], mappedBook['codeC2'], mappedBook['codeC3'], mappedBook['codeC4']];
      mappedBook.code = `${ codeParts[0] ?? 'χχ' }${ codeParts[1] ?? 'ΧΧ' }` +
        `${ codeParts[2] ?? 'χχ' }${ codeParts[3] ?? 'ΧΧ' }`;
      delete mappedBook['codeC1'];
      delete mappedBook['codeC2'];
      delete mappedBook['codeC3'];
      delete mappedBook['codeC4'];

      return mappedBook;
    });

    await this.saveBooksData(mappedData);
  }

  async *search(query) {
    if (!query) {
      for (const book of this.booksData) {
        yield book;
      }
      return;
    }

    const normalizedQuery = normalize(query).replace(/ /g, '');
    for (const book of this.booksData) {
      const normalizedTitle = normalize(book.title)?.replace(/ /g, '');
      if (normalizedTitle?.includes(normalizedQuery)) {
        yield book;
        continue;
      }
      const normalizedAuthor = normalize(book.author)?.replace(/ /g, '');
      if (normalizedAuthor?.includes(normalizedQuery)) {
        yield book;
        continue;
      }
      const normalizedPublisher = normalize(book.publisher)?.replace(/ /g, '');
      if (normalizedPublisher?.includes(normalizedQuery)) {
        yield book;
        continue;
      }
      const normalizedCode = normalize(book.code)?.replace(/ /g, '');
      if (normalizedCode?.includes(normalizedQuery)) {
        yield book;
      }
    }
  }

  // Private

  booksDataCache;

  get booksData() {
    return this.booksDataCache;
  }

  async loadBooksData() {
    // Get from session storage
    const data = sessionStorage.getItem('books');
    this.booksDataCache = JSON.parse(data) ?? [];
  }

  async saveBooksData(data) {
    // Store in cache
    this.booksDataCache = data;

    // Store in session storage
    sessionStorage.setItem('books', JSON.stringify(data));
  }
}