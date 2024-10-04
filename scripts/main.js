import {DependencyInjection} from "./services/dependency-injection.js";
import {MainUI} from "./ui/main-ui.js";

const services = new DependencyInjection();
window.services = services;

const ui =
window.ui = new MainUI();

document.addEventListener('DOMContentLoaded', async () => {
    await services.init();
    await ui.init();
});
