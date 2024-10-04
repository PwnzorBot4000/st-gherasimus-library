import {BooksApi} from "../api/books-api.js";
import {SettingsAPI} from "../api/settings-api.js";
import {SettingsUI} from "../ui/settings-ui.js";
import {SearchResultsUI} from "../ui/search-results-ui.js";
import {SpreadsheetMapper} from "./spreadsheet-mapper.js";

export class DependencyInjection {
  instances = {};

  constructor() {
    // Construction phase.
    // At this point, the page is not yet loaded, so we can't use the DOM.
    // We have no dependency injector yet, so we can't use the services.
    // All services are constructed here.

    // Data layer services
    // - (None yet)
    // Common services
    this.register('spreadsheetMapper', new SpreadsheetMapper());
    // APIs
    this.register('booksApi', new BooksApi());
    this.register('settingsApi', new SettingsAPI());
    // UI managers
    this.register('settingsUi', new SettingsUI());
    this.register('searchResultsUi', new SearchResultsUI());
  }

  get(name) {
    return this.instances[name];
  }

  async init() {
    // Initialization phase.
    // At this point, the page is loaded, so we can use the DOM.
    // We can use the dependency injector to get services.
    // All services are initialized here.

    for (const name in this.instances) {
      await this.instances[name].init?.();
    }
  }

  register(name, instance) {
    this.instances[name] = instance;
  }
}