const fs = require('fs');
const tmp = require('tmp');

tmp.setGracefulCleanup();

// Write temporary file to disk
const writeTemporaryFile = (data, postfix) => new Promise((resolve, reject) => {
  const blueprintObject = tmp.fileSync({ discardDescriptor: true, postfix });
  fs.writeFile(blueprintObject.name, data, (error) => {
    if (error) reject(new Error(error.message));
    resolve(blueprintObject);
  });
});

// Blueprint keys are case-insensitive
const getOwnPropertyCaseInsensitive = (object, property) => {
  const matchedProperties = Object
    .keys(object)
    .filter((key) => key.toLowerCase() === property.toLowerCase());
  if (matchedProperties.length > 0) return matchedProperties[0];
  return null;
};

module.exports = {
  writeTemporaryFile,
  getOwnPropertyCaseInsensitive,
};
