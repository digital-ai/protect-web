const querystring = require('querystring');
const path = require('path');
const request = require('request-promise-native');
const fs = require('fs-extra');
const download = require('download');
const dmg = require('dmg');
const configuration = require('./configuration');

const { SUPPORT_EMAIL, apiKey, apiSecret } = configuration;

// Get an authentication token
const authenticate = (key, secret) => {
  const options = {
    method: 'POST',
    uri: `${configuration.API}/services/oauth2/token`,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    form: {
      grant_type: 'client_credentials',
      client_id: key,
      client_secret: secret,
    },
    json: true,
  };

  return request(options)
    .then(response => ({
      type: response.token_type,
      token: response.access_token,
    }))
    .catch(error => Promise.reject(new Error(`Authentication failed. Error message: ${error.message}`)));
};

// Get the package name given the version
const getPackageName = (accessToken) => {
  const headers = {
    product: configuration.product,
    version: '6.5.0',
  };
  const urlArguments = querystring.stringify(headers);
  const options = {
    method: 'GET',
    uri: `${configuration.API_SERVICES}download/v1/filelist?${urlArguments}`,
    headers: {
      authorization: `${accessToken.type} ${accessToken.token}`,
    },
    json: true,
  };

  return request(options)
    .then((response) => {
      const filteredNames = response
        .filter(file => file.platform === configuration.platform)
        .filter(file => file.filename.startsWith('protect-web'));
      if (!filteredNames.length) {
        return Promise.reject(new Error(`Digital.ai Web App Protection 6.5.0 could not be downloaded. Please contact ${SUPPORT_EMAIL} for help resolving this issue.`));
      }
      return { packageName: filteredNames[0].filename, accessToken };
    })
    .catch(() => Promise.reject(new Error('Digital.ai Web App Protection 6.5.0 could not be downloaded. Make sure you have the "Product download" entitlement associated with the API key.')));
};

const isDmgPackage = filename => filename.endsWith('.dmg');

// Get the package and extract it
const getPackage = (accessToken, filename) => {
  const headers = {
    product: configuration.product,
    version: '6.5.0',
    filename,
  };
  const urlArguments = querystring.stringify(headers);
  const options = {
    uri: `${configuration.API_SERVICES}download/v1/file?${urlArguments}`,
    headers: {
      authorization: `${accessToken.type} ${accessToken.token}`,
    },
    extract: !isDmgPackage(filename),
  };

  fs.removeSync(configuration.installLocation);
  fs.ensureDirSync(configuration.installLocation);

  return download(options.uri, configuration.installLocation, options)
    .then(() => filename)
    .catch(error => Promise.reject(new Error(`Failed to download Digital.ai Web App Protection 6.5.0. Error message: ${error.message}`)));
};

// Extract DMG into install location
const extractDmg = filename => new Promise((resolve, reject) => {
  const downloadedFile = path.join(configuration.installLocation, filename);

  dmg.mount(downloadedFile, (mountError, mountPath) => {
    if (mountError) reject(new Error(`Failed to mount Digital.ai Web App Protection 6.5.0 DMG package. ${mountError.message}`));
    fs.copySync(mountPath, configuration.installLocation);
    dmg.unmount(mountPath, (unmountError) => {
      if (unmountError) reject(new Error(`Failed to unmount Digital.ai Web App Protection 6.5.0 DMG package. ${unmountError.message}`));
      fs.removeSync(downloadedFile);
      resolve();
    });
  });
});

const metadataFile = path.join(configuration.installLocation, 'metadata.json');

// Write the version of just downloaded file into a metadata file
const writeMetadataFile = () => {
  const jsonContents = {
    version: '6.5.0',
  };
  return fs.writeJson(metadataFile, jsonContents)
    .catch(() => Promise.reject(new Error(`Internal error: Failed to write to metadata.json. Please contact ${SUPPORT_EMAIL} for help resolving this issue.`)));
};

// Read the metadata file for the version
const readMetadataFile = () => {
  const jsonContents = fs.readJsonSync(metadataFile, { throws: false });
  if (!jsonContents) {
    return {};
  }
  return jsonContents;
};

const downloadPackage = () => authenticate(apiKey, apiSecret)
  .then(accessToken => getPackageName(accessToken))
  .then(({ packageName, accessToken }) => getPackage(accessToken, packageName))
  .then((packageName) => {
    if (isDmgPackage(packageName)) return extractDmg(packageName);
    return Promise.resolve();
  })
  .then(() => writeMetadataFile());

module.exports = {
  readMetadataFile,
  downloadPackage,
};
