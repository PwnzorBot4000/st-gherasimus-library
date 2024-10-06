export class MainUI {
  async init() {
    // APIs
    this.booksApi = services.get('booksApi');
    this.settingsApi = services.get('settingsApi');

    // UI managers
    this.searchResults = services.get('searchResultsUi');
    this.settings = services.get('settingsUi');

    // UI elements
    this.elem = document.getElementById('main-ui');
    this.searchElem = document.getElementById('search');
    this.settingsWindowElem = document.getElementById('settings-window');

    // Show
    await this.open();
  }

  async downloadXlsx() {
    const xlsx = await import('../external/xlsx.mjs');
    const cptable = await import('../external/cpexcel.full.mjs');
    xlsx.set_cptable(cptable);
    const json = await this.booksApi.exportData();
    const worksheet = xlsx.utils.json_to_sheet(json);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Βιβλία');
    xlsx.writeFile(workbook, 'books.xlsx');
  }

  async open() {
    await this.refresh();
    this.elem.style.display = null;
  }

  async refresh() {
    await this.search();
  }

  async search() {
    let searchTerm = this.searchElem.value.trim();
    if (searchTerm.length < 2) {
      searchTerm = null;
    }

    const resultsGenerator = this.booksApi.search(searchTerm);

    await this.searchResults.showProgressive(resultsGenerator);
  }

  async uploadXlsx(file) {
    const wasEmpty = await this.booksApi.hasData();
    const xlsx = await import('../external/xlsx.mjs');
    const cptable = await import('../external/cpexcel.full.mjs');
    xlsx.set_cptable(cptable);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const workbook = await xlsx.read(e.target.result);
      const rows = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });

      // Upload to BooksApi
      await this.booksApi.importData(rows.slice(1), rows[0]);

      if (wasEmpty) {
        // Estimate library id
        const libraryId = await this.booksApi.estimateTerminalLocation();
        this.settingsApi.setAutodetect('terminal-location', libraryId);
      }

      // Refresh
      await this.refresh();
    };
    reader.readAsArrayBuffer(file);
  }
}