const TAURI=window.__TAURI__;function injectTauriAPIs(appAPI){const{invoke:invoke}=TAURI.tauri;appAPI.toggleDevtools=async function(){return invoke("toggle_devtools",{})}}function initTauriShell(appAPI){injectTauriAPIs(appAPI)}export default initTauriShell;
//# sourceMappingURL=tauriShell.js.map
