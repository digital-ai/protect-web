const { existsSync } = require('fs');
const { exec } = require('child-process-promise');
const {
  binaryLocation,
  SUPPORT_EMAIL,
  apiKey,
  apiSecret,
} = require('./configuration');
const utils = require('./utils');
const { readMetadataFile, downloadPackage } = require('./install');

// Promise-based package downloader
const checkPackage = () => {
  const metadata = readMetadataFile();
  if (metadata.version !== '6.6.0') {
    if (apiKey && apiSecret) {
      return downloadPackage();
    }
    return Promise.reject(new Error('Could not find environment variables required to download Digital.ai Web App Protection: PROTECT_API_KEY and PROTECT_API_SECRET. Refer to README to learn how to set it up correctly.'));
  }
  return Promise.resolve();
};

// Add ephemeral token inside the blueprint if none is found, but it exists as env variable
const fixUpBlueprint = blueprint => new Promise((resolve, reject) => {
  const updatedBlueprint = blueprint;
  const ephemeralToken = process.env.PROTECT_LICENSE_TOKEN;
  const licenseRegion = process.env.PROTECT_LICENSE_REGION;

  if (!existsSync(binaryLocation) && (!apiKey || !apiSecret)) {
    reject(new Error('Could not find environment variables required to download Digital.ai Web App Protection: PROTECT_API_KEY and PROTECT_API_SECRET. Refer to README to learn how to set it up correctly.'));
  }

  const globalConfigurationKey = utils.getOwnPropertyCaseInsensitive(updatedBlueprint, 'globalConfiguration');
  if (!globalConfigurationKey) {
    if (ephemeralToken) {
      updatedBlueprint.globalConfiguration = {
        ephemeralMode: ephemeralToken,
      };
      if (licenseRegion) {
        updatedBlueprint.globalConfiguration.licenseRegion = licenseRegion;
      }
      resolve(updatedBlueprint);
    }
  } else {
    const ephemeralModeKey = utils.getOwnPropertyCaseInsensitive(updatedBlueprint[globalConfigurationKey], 'ephemeralMode');
    const licenseRegionKey = utils.getOwnPropertyCaseInsensitive(updatedBlueprint[globalConfigurationKey], 'licenseRegion');

    if (!ephemeralModeKey) {
      if (ephemeralToken) {
        updatedBlueprint[globalConfigurationKey].ephemeralMode = ephemeralToken;
      }
    }

    if (!licenseRegionKey) {
      if (licenseRegion) {
        updatedBlueprint[globalConfigurationKey].licenseRegion = licenseRegion;
      }
    }

    if (ephemeralModeKey || ephemeralToken) {
      resolve(updatedBlueprint);
    }
  }

  reject(new Error('Could not find environment variable required to license Digital.ai Web App Protection: PROTECT_LICENSE_TOKEN. Refer to README file to learn how to set it up.'));
});

const protect = blueprint => checkPackage()
  .then(() => fixUpBlueprint(blueprint))
  .then((updatedBlueprint) => {
    const blueprintStr = JSON.stringify(updatedBlueprint);
    return utils.writeTemporaryFile(blueprintStr, '.blueprint');
  })
  .then((blueprintObject) => {
    const cmd = `${binaryLocation} --blueprint ${blueprintObject.name}`;
    return new Promise((resolve, reject) => {
      process.env.SJS_NPM_INVOCATION = 'true';
      exec(cmd)
        .then(output => resolve({
          stdout: output.stdout,
          stderr: output.stderr,
        }))
        .catch((error) => {
          const errorMessage = error.stderr || `Internal error. Please contact ${SUPPORT_EMAIL} for help resolving this issue.`;
          const message = `${error.stdout}\n${errorMessage}`;
          reject(new Error(message));
        })
        .then(() => {
          delete process.env.SJS_NPM_INVOCATION;
        });
    });
  });

module.exports = protect;
