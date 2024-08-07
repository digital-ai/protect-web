const fs = require('fs');
const path = require('path');
const tmp = require('tmp');
const protect = require('./protect');
const utils = require('./utils');

tmp.setGracefulCleanup();

// Iterate through directory recursively
const iterateDirectory = (directory, prefix, callback) => {
  const entries = fs.readdirSync(directory);
  entries.forEach((entry) => {
    const joinedPath = path.join(directory, entry);
    const prefixedEntry = path.join(prefix, entry);
    const stat = fs.statSync(joinedPath);
    if (stat && stat.isDirectory()) {
      iterateDirectory(joinedPath, prefixedEntry, callback);
    } else {
      callback(prefixedEntry);
    }
  });
};

class WebpackPlugin {
  constructor(blueprint, options = {}) {
    this.options = options;
    if (!blueprint) {
      this.blueprint = {
        guardConfigurations: {
          guardConfiguration: {
          },
        },
      };
    } else {
      this.blueprint = blueprint;
      const targetsKey = utils.getOwnPropertyCaseInsensitive(this.blueprint, 'targets');
      if (targetsKey) {
        const targets = Object.keys(this.blueprint[targetsKey]);
        targets.forEach((targetKey) => {
          const target = this.blueprint[targetsKey][targetKey];
          const inputKey = utils.getOwnPropertyCaseInsensitive(target, 'input');
          if (inputKey) {
            delete target[inputKey];
          }
          const outputFileKey = utils.getOwnPropertyCaseInsensitive(target, 'outputFile');
          if (outputFileKey) {
            delete target[outputFileKey];
          }
          const outputDirectoryKey = utils.getOwnPropertyCaseInsensitive(target, 'outputDirectory');
          if (outputDirectoryKey) {
            delete target[outputDirectoryKey];
          }
          const outputKey = utils.getOwnPropertyCaseInsensitive(target, 'output');
          if (outputKey) {
            delete target[outputKey];
          }
          const stdinKey = utils.getOwnPropertyCaseInsensitive(target, 'stdin');
          if (stdinKey) {
            delete target[stdinKey];
          }
          const ignorePathsKey = utils.getOwnPropertyCaseInsensitive(target, 'ignorePaths');
          if (ignorePathsKey) {
            delete target[ignorePathsKey];
          }
          const validateIgnorePathsKey = utils.getOwnPropertyCaseInsensitive(target, 'validateIgnorePaths');
          if (validateIgnorePathsKey) {
            delete target[validateIgnorePathsKey];
          }
        });
      }

      // Search for a target type
      const globalConfigurationKey = utils.getOwnPropertyCaseInsensitive(this.blueprint, 'globalConfiguration');
      if (globalConfigurationKey) {
        const targetTypeKey = utils.getOwnPropertyCaseInsensitive(this.blueprint[globalConfigurationKey], 'targetType');
        if (targetTypeKey) {
          this.targetType = this.blueprint[globalConfigurationKey][targetTypeKey].toLowerCase();
        }
      }
    }

    if (!this.targetType) {
      this.targetType = 'browser';
    }
  }

  apply(compiler) {
    this.apply5(compiler);
  }

  apply5(compiler) {
    compiler.hooks.thisCompilation.tap('digital.ai.Protection', (compilation) => {
      compilation.hooks.processAssets.tapAsync(
        {
          name: 'Protection',
          stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_INLINE,
        },
        (assets, callback) => {
          const logger = compilation.getLogger('digital.ai.Protection');

          const tempInputDirectory = tmp.dirSync({ unsafeCleanup: true });
          const tempOutputDirectory = tmp.dirSync({ unsafeCleanup: true });

          // Debug mode for Native Script requires exact folder structures
          let adjustedInputDirectory;
          let adjustedOutputDirectory;
          switch (this.targetType) {
            case 'nativescript-ios': {
              adjustedInputDirectory = path.join(tempInputDirectory.name, 'app');
              adjustedOutputDirectory = path.join(tempOutputDirectory.name, 'app');
              break;
            }

            case 'nativescript-android': {
              adjustedInputDirectory = path.join(tempInputDirectory.name, 'assets/app');
              adjustedOutputDirectory = path.join(tempOutputDirectory.name, 'assets/app');
              break;
            }

            default: {
              adjustedInputDirectory = tempInputDirectory.name;
              adjustedOutputDirectory = tempOutputDirectory.name;
            }
          }

          // Find app name in package.json
          let appName = '';
          const filePath = path.join(compiler.options.context, 'package.json');
          if (fs.existsSync(filePath)) {
            const packageJson = JSON.parse(fs.readFileSync(filePath));
            appName = packageJson.name;
          }

          // First store chunks in a temporary input folder
          try {
            Object.keys(assets).forEach((filename) => {
              if (/\.(js|html|htm|jsbundle|android\.bundle|xhtml|jsp|asp|aspx|map)$/.test(filename)) {
                const content = compilation.getAsset(filename).source.source();
                const tempFile = path.join(adjustedInputDirectory, filename);
                const tempDir = path.dirname(tempFile);
                if (!fs.existsSync(tempDir)) {
                  fs.mkdirSync(tempDir, { recursive: true });
                }
                fs.writeFileSync(tempFile, content);
              }
            });
          } catch (error) {
            callback(error);
          }

          // Search for appID
          const globalConfigurationKey = utils.getOwnPropertyCaseInsensitive(this.blueprint, 'globalConfiguration');
          if (globalConfigurationKey) {
            const appIDKey = utils.getOwnPropertyCaseInsensitive(this.blueprint[globalConfigurationKey], 'appID');
            // If appID is not set in the blueprint, set appID = name (from package.json)
            if (!appIDKey && appName !== '') {
              this.blueprint.globalConfiguration.appID = appName;
            }
          } else if (appName !== '') {
            this.blueprint.globalConfiguration = {
              appID: appName,
            };
          }

          const blueprint = Object.assign({}, this.blueprint);

          let targetsKey = utils.getOwnPropertyCaseInsensitive(blueprint, 'targets');
          if (!targetsKey) {
            targetsKey = 'targets';
            blueprint[targetsKey] = {};
          }

          const targets = Object.keys(blueprint[targetsKey]);
          if (targets.length > 1) {
            callback(new Error('Digital.ai Web App Protection could not apply protection on multiple targets. Please remove all targets except one from the blueprint.'));
            return;
          }
          let targetKey = targets[0];

          if (!targetKey) {
            targetKey = 'target';
            blueprint[targetsKey][targetKey] = {};
          }

          blueprint[targetsKey][targetKey].input = tempInputDirectory.name;
          blueprint[targetsKey][targetKey].output = tempOutputDirectory.name;

          // Then protect the input folder in one swoop, replacing chunks with protected code
          try {
            protect(blueprint, this.options)
              .then((output) => {
                iterateDirectory(adjustedOutputDirectory, '.', (source) => {
                  const tempFile = path.join(adjustedOutputDirectory, source);
                  const contents = fs.readFileSync(tempFile);

                  compilation.updateAsset(
                    source,
                    new compilation.compiler.webpack.sources.RawSource(contents),
                  );
                });
                logger.log(output.stdout);
                if (output.stderr) {
                  logger.log(output.stderr);
                }
                callback();
              }).catch((error) => {
                callback(error);
              });
          } catch (error) {
            callback(error);
          }
        },
      );
    });
  }
}

module.exports = WebpackPlugin;
