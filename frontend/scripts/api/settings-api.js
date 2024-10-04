export class SettingsAPI {
  static defaultSettings = {
    'terminal-location': 'library',
  };

  cache;
  callbacks = {};

  bind(setting, callback) {
    if (!this.callbacks[setting]) {
      this.callbacks[setting] = [];
    }
    this.callbacks[setting].push(callback);
  }

  get(setting) {
    const settings = this.getSettings();
    return settings[setting] ??
      settings[`${setting}-autodetect`] ??
      SettingsAPI.defaultSettings[setting];
  }

  notify(setting) {
    if (!this.callbacks[setting]) return;

    const value = this.get(setting);
    this.callbacks[setting].forEach(callback => callback(value));
  }

  reset(setting) {
    const settings = this.getSettings();
    delete settings[setting];
    delete settings[`${setting}-autodetect`];
    this.cache = settings;
    localStorage.setItem('settings', JSON.stringify(settings));

    this.notify(setting);
  }

  set(setting, value) {
    const settings = this.getSettings();
    settings[setting] = value;
    this.cache = settings;
    localStorage.setItem('settings', JSON.stringify(settings));

    this.notify(setting);
  }

  setAutodetect(setting, value) {
    const settings = this.getSettings();
    settings[`${setting}-autodetect`] = value;
    this.cache = settings;
    localStorage.setItem('settings', JSON.stringify(settings));

    this.notify(setting);
  }

  unbind(setting, callback) {
    if (!this.callbacks[setting]) {
      return;
    }
    const index = this.callbacks[setting].indexOf(callback);
    if (index > -1) {
      this.callbacks[setting].splice(index, 1);
    }
  }

  // Private

  getSettings() {
    if (!this.cache) {
      this.cache = JSON.parse(localStorage.getItem('settings')) || {};
    }

    return this.cache;
  }
}