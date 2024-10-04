export class SettingsUI {
  async autodetectTerminalLocation() {
    this.api.reset('terminal-location');
    const libraryId = await this.booksApi.estimateTerminalLocation();
    this.api.setAutodetect('terminal-location', libraryId);
  }

  close() {
    this.elem.style.display = 'none';
    this.api.unbind('terminal-location', this.refreshCallback);
  }

  async init() {
    this.api = services.get('settingsApi');
    this.booksApi = services.get('booksApi');
    this.elem = document.getElementById('settings-window');
    this.refreshCallback = this.refresh.bind(this);
  }

  open() {
    this.refresh();
    this.elem.style.display = null;
    this.api.bind('terminal-location', this.refreshCallback);
  }

  refresh() {
    document.getElementById('terminal-location-reading-room').checked =
      this.api.get('terminal-location') === 'reading-room';
    document.getElementById('terminal-location-library').checked =
      this.api.get('terminal-location') === 'library';
    document.getElementById('terminal-location-expo').checked =
      this.api.get('terminal-location') === 'expo';
  }

  set(setting, value) {
    this.api.set(setting, value);
    this.refresh();
  }
}