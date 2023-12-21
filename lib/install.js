const axios = require('axios');
const decompress = require('decompress');
const dmg = require('dmg');
const fs = require('fs-extra');
const fsPromise = require('fs').promises;
const path = require('path');

const configuration = require('./configuration');

const { SUPPORT_EMAIL, apiKey, apiSecret } = configuration;

// Get an authentication token
const authenticate = (key, secret) => {
  const options = {
    method: 'post',
    url: `${configuration.API}/services/oauth2/token`,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    data: {
      grant_type: 'client_credentials',
      client_id: key,
      client_secret: secret,
    },
    responseType: 'json',
  };

  return axios(options)
    .then(response => ({
      type: response.data.token_type,
      token: response.data.access_token,
    }))
    .catch(error => Promise.reject(new Error(`Authentication failed. Error message: ${error.response ? error.response.data.error_description : error.message}`)));
};

// Get the package name given the version
const getPackageName = (accessToken) => {
  const headers = {
    product: configuration.product,
    version: '6.7.0',
  };
  const urlArguments = new URLSearchParams(headers);
  const options = {
    method: 'get',
    url: `${configuration.API_SERVICES}download/v1/filelist?${urlArguments.toString()}`,
    headers: {
      authorization: `${accessToken.type} ${accessToken.token}`,
    },
    responseType: 'json',
  };

  return axios(options)
    .then((response) => {
      const filteredNames = response.data
        .filter(file => file.platform === configuration.platform)
        .filter(file => file.filename.startsWith('protect-web'));
      if (!filteredNames.length) {
        return Promise.reject(new Error(`Digital.ai Web App Protection 6.7.0 could not be downloaded. Please contact ${SUPPORT_EMAIL} for help resolving this issue.`));
      }
      return { packageName: filteredNames[0].filename, accessToken };
    })
    .catch(() => Promise.reject(new Error('Digital.ai Web App Protection 6.7.0 could not be downloaded. Make sure you have the "Product download" entitlement associated with the API key.')));
};

const isDmgPackage = filename => filename.endsWith('.dmg');

// Get the package and extract it
const getPackage = (accessToken, filename) => {
  const headers = {
    product: configuration.product,
    version: '6.7.0',
    filename,
  };
  const urlArguments = new URLSearchParams(headers);
  const options = {
    method: 'get',
    url: `${configuration.API_SERVICES}download/v1/file?${urlArguments.toString()}`,
    headers: {
      authorization: `${accessToken.type} ${accessToken.token}`,
    },
    responseType: 'arraybuffer',
  };
  const filePath = path.join(configuration.installLocation, filename);

  fs.removeSync(configuration.installLocation);
  fs.ensureDirSync(configuration.installLocation);

  return axios(options)
    .then(response => fsPromise.writeFile(filePath, Buffer.from(response.data)))
    .then(() => {
      if (isDmgPackage(filename)) return Promise.resolve();
      return decompress(filePath, configuration.installLocation);
    })
    .then(() => filename)
    .catch(error => Promise.reject(new Error(`Failed to download Digital.ai Web App Protection 6.7.0. Error message: ${error.message}`)));
};

// Extract DMG into install location
const extractDmg = filename => new Promise((resolve, reject) => {
  const downloadedFile = path.join(configuration.installLocation, filename);

  dmg.mount(downloadedFile, (mountError, mountPath) => {
    if (mountError) reject(new Error(`Failed to mount Digital.ai Web App Protection 6.7.0 DMG package. ${mountError.message}`));
    fs.copySync(mountPath, configuration.installLocation);
    dmg.unmount(mountPath, (unmountError) => {
      if (unmountError) reject(new Error(`Failed to unmount Digital.ai Web App Protection 6.7.0 DMG package. ${unmountError.message}`));
      resolve(downloadedFile);
    });
  });
});

const metadataFile = path.join(configuration.installLocation, 'metadata.json');

// Write the version of just downloaded file into a metadata file
const writeMetadataFile = () => {
  const jsonContents = {
    version: '6.7.0',
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
    return Promise.resolve(path.join(configuration.installLocation, packageName));
  })
  .then((downloadedFile) => {
    fs.removeSync(downloadedFile);
    return writeMetadataFile();
  });

module.exports = {
  readMetadataFile,
  downloadPackage,
};
