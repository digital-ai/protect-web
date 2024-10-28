const fs = require('fs-extra');
const { readMetadataFile, downloadPackage } = require('./install');
const { apiKey, apiSecret, installLocation } = require('./configuration');

const exitWithMessage = (error) => {
  // eslint-disable-next-line no-console
  console.error(error.message);
  fs.removeSync(installLocation);
  process.exit(1);
};

const metadata = readMetadataFile();
if (metadata.version !== '7.5.0') {
  if (apiKey && apiSecret) {
    downloadPackage().catch(exitWithMessage);
  } else {
    // eslint-disable-next-line no-console
    console.warn('Digital.ai Web App Protection 7.5.0 was not downloaded. A download will be attempted again during protection.');
  }
}
