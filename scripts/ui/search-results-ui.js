export class SearchResultsUI {
  static defaultColumns = {
    'reading-room': [
      'code',
      'title',
      'author',
    ],
    'library': [
      'code',
      'title',
      'author',
    ],
    'expo': [
      'title',
      'author',
      'publisher',
    ]
  };

  static headerNames = {
    author: 'Συγγραφέας',
    code: 'Κωδικός',
    entryDate: 'Ημ. Εισ.',
    entryId: 'Αρ. Εισ.',
    index: 'Α/Α',
    publisher: 'Εκδότης',
    title: 'Τίτλος',
  };

  additionalPageSize = 50;
  columnOverrides = {
    'reading-room': [],
    'library': [],
    'expo': [],
  };
  initialPageSize = 20;
  pageSize;
  results = [];
  resultsGenerator;

  getVisibleColumns() {
    const terminalLocation = this.settingsApi.get('terminal-location');
    const defaultColumns = SearchResultsUI.defaultColumns[terminalLocation];
    const columnOverrides = this.columnOverrides[terminalLocation];

    let visibleColumns = [...defaultColumns];
    for (const override of columnOverrides) {
      if (visibleColumns.includes(override)) {
        visibleColumns.splice(visibleColumns.indexOf(override), 1);
      } else {
        visibleColumns.push(override);
      }
    }

    return visibleColumns;
  }

  async init() {
    this.settingsApi = services.get('settingsApi');
    this.elem = document.getElementById('search-results');
    this.template = document.getElementById('search-result-template');

    this.settingsApi.bind('terminal-location', this.refresh.bind(this));
  }

  refresh() {
    this.clear();
    this.addHeader();
    for (const result of this.results) {
      this.add(result);
    }
  }

  toggleBookDetails(bookIndex) {
    const book = this.results[bookIndex];
    const bookElem = this.elem.querySelector(`.search-result:nth-child(${bookIndex + 2})`);
    const nextBookElem = this.elem.querySelector(`.search-result:nth-child(${bookIndex + 3})`);
    const detailsButtonElem = bookElem.querySelector('.search-result-controls button');
    const isOpen = bookElem.classList.contains('search-result-open');

    if (isOpen) {
      this.elem.removeChild(this.elem.querySelector(`.search-result:nth-child(${bookIndex + 2}) + .book-details`));

      bookElem.classList.remove('search-result-open');
      detailsButtonElem.innerHTML = '&#x25bc;';
    } else {
      const bookDetailsElem = document.getElementById('book-details-template').content.cloneNode(true);
      bookDetailsElem.querySelector('.book-details-title').textContent = `${book.title} - ${book.author}`;
      bookDetailsElem.querySelector('.book-detail-entry-id').textContent = book.entryId;
      bookDetailsElem.querySelector('.book-detail-date').textContent = book.entryDate;
      bookDetailsElem.querySelector('.book-detail-publisher').textContent = book.publisher;
      bookDetailsElem.querySelector('.book-detail-year').textContent = book.year;
      bookDetailsElem.querySelector('.book-detail-num-copies').textContent = book.numCopies;
      bookDetailsElem.querySelector('.book-detail-description').textContent = book.description;
      // TODO add more details per location, hide empty ones

      this.elem.insertBefore(bookDetailsElem, nextBookElem);

      detailsButtonElem.innerHTML = '&#x25b2;';
      bookElem.classList.add('search-result-open');
    }
  }

  setColumnVisible(column, visible) {
    const terminalLocation = this.settingsApi.get('terminal-location');
    const defaultColumns = SearchResultsUI.defaultColumns[terminalLocation];
    const columnOverrides = this.columnOverrides[terminalLocation];

    if (visible) {
      if (!defaultColumns.includes(column) && !columnOverrides.includes(column)) {
        columnOverrides.push(column);
      } else if (defaultColumns.includes(column) && columnOverrides.includes(column)) {
        columnOverrides.splice(columnOverrides.indexOf(column), 1);
      }
    } else {
      if (defaultColumns.includes(column) && !columnOverrides.includes(column)) {
        columnOverrides.push(column);
      } else if (!defaultColumns.includes(column) && columnOverrides.includes(column)) {
        columnOverrides.splice(columnOverrides.indexOf(column), 1);
      }
    }
  }

  async showProgressive(results) {
    if (this.resultsGenerator) {
      this.resultsGenerator.return();
    }
    this.pageSize = this.initialPageSize;

    this.resultsGenerator = results;
    this.results = [];
    this.clear();
    this.addHeader();

    let counter = 0;
    while (counter < this.pageSize) {
      const resultIter = await this.resultsGenerator.next();
      if (resultIter.done) break;

      this.results.push(resultIter.value);
      this.add(resultIter.value);

      counter++;
      if (counter >= this.pageSize) {
        this.addShowMoreButton();
        break;
      }
    }
  }

  async showMore() {
    this.pageSize += this.additionalPageSize;
    this.removeShowMoreButton();

    let counter = 0;
    while (counter < this.additionalPageSize) {
      const resultIter = await this.resultsGenerator.next();
      if (resultIter.done) break;

      this.results.push(resultIter.value);
      this.add(resultIter.value);

      counter++;
      if (counter >= this.additionalPageSize) {
        this.addShowMoreButton();
        break;
      }
    }
  }

  // Private

  add(result, options = {}) {
    const visibleColumns = this.getVisibleColumns();
    const rowCount = this.elem.querySelectorAll('.search-result').length;
    const resultElem = document.createElement('div');
    resultElem.classList.add('search-result');

    // Add values
    for (const key of visibleColumns) {
      const fieldElem = document.createElement('div');
      fieldElem.classList.add(`search-result-${key}`);
      switch (key) {
        case 'index': {
          fieldElem.textContent = rowCount.toString();
          break;
        }
        default: {
          fieldElem.textContent = result[key] ?? '';
          break;
        }
      }
      resultElem.appendChild(fieldElem);
    }

    // Add controls
    const controlsElem = document.createElement('div');
    controlsElem.classList.add('search-result-controls');
    controlsElem.innerHTML = options.controls
      || `<button inline onclick="ui.searchResults.toggleBookDetails(${rowCount - 1})">&#x25bc;</button>`;
    resultElem.appendChild(controlsElem);

    this.elem.appendChild(resultElem);
  }

  addHeader() {
    const visibleColumns = this.getVisibleColumns();

    this.add(visibleColumns.reduce((acc, column) => {
      acc[column] = SearchResultsUI.headerNames[column];
      return acc;
    }, {}), {
      controls: '<button inline>&#x2699;</button>',
    });
  }

  addShowMoreButton() {
    const showMoreElem = document.createElement('div');
    showMoreElem.id = 'search-results-show-more';
    showMoreElem.innerHTML = '<button inline link onclick="ui.searchResults.showMore()">Περισσότερα αποτελέσματα...</button>';
    this.elem.appendChild(showMoreElem);
  }

  clear() {
    this.elem.innerHTML = '';
  }

  removeShowMoreButton() {
    document.getElementById('search-results-show-more').remove();
  }
}