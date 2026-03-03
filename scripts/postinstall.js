/**
 * Postinstall script for web-only AionUi.
 * Keep this script as a no-op so install remains stable without Electron toolchain.
 */
function runPostInstall() {
  console.log('[postinstall] Web-only mode: skipping Electron native rebuild steps.');
}

if (require.main === module) {
  runPostInstall();
}

module.exports = runPostInstall;
