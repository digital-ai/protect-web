# Digital.ai Web App Protection Installation Manager

Integrate Digital.ai protection into your npm or webpack workflow.

## Prerequisites

Before you can install or use this package, you must:

1. Be a current Digital.ai customer.
2. Review the platform requirements in the most recent version of the *Digital.ai Web App Protection* online help, which is available from Digital.ai.
3. Obtain an API Key, API Secret, and License Token (optional) from Digital.ai.
    * Make sure the API Key has the "Product download" checkbox checked.
4. Add the following environment variables:

```
PROTECT_API_KEY="myapikey"
PROTECT_API_SECRET="mysecret"
PROTECT_LICENSE_TOKEN="mylicensetoken"
PROTECT_LICENSE_REGION="myregion"
```

**NOTE:** `PROTECT_LICENSE_TOKEN` can be setup after the package has been installed.

**NOTE:** `PROTECT_LICENSE_REGION` variable is optional, the default region is "NorthAmerica".

**NOTE:** `PROTECT_API_KEY`, `PROTECT_API_SECRET` and `PROTECT_LICENSE_REGION` can be setup before the package has been installed, or after. If they are set up after the package has been installed, then the package dependencies will be downloaded the first time the protection is run. Otherwise, the package dependencies are downloaded during the package installation.

**NOTE:** Instead of providing a license token as `PROTECT_LICENSE_TOKEN`, an alternative command can be used to set up licensing interactively, see the section "License setup" below

**NOTE:** This package should not be installed globally.

**NOTE:** Web App will not run on Alpine Linux because of differences in shared system libraries. We recommend that you avoid using an Alpine Linux based image for Docker or any other container.

## Protect

This package offers production-ready essential protection that quickly and automatically adds additional security and tamper detection to your code without any manual configuration.

To run protection, add the following code at the end of your build:

```
const {protect} = require('protect-web');
const blueprint = {
    targets: {
        main: {
            "input": "./dist",
            "output": "./dist_protected"
        }
    }
}
protect(blueprint).then((output) => {
    console.log(output.stdout);
    console.error(output.stderr);
}).catch((err) => {
    console.error(err.message);
});
```

Notice the object called `blueprint`. To apply essential protection, you only need to modify the values of `"input"` and `"output"`, where `"./dist"` is the directory that contains your input files and `"./dist_protected"` is the directory where the final protected files will appear.

However, you can further customize your protection by modifying the `blueprint` object. For instructions, see the *Digital.ai Web App Protection* online help, which is available from Digital.ai.

`protect` function also accepts an optional `options` object, which allows you to configure how the protection will be applied. The following option is currently configurable:

* verbose [true/false] - when set to true, protection will print out a more verbose output about what it is doing
* bufferSize [size in bytes] - maximum buffer size for protection logs, default is 500 kilobytes

A modified example from above with a buffer size of 1 megabyte would look like this:

```
...
protect(blueprint, {bufferSize: 1048576}).then((output) => {
...
```

### Protect with Webpack

**NOTE**: Both Webpack 4 and 5 are supported. If using Webpack 5, only versions 5.8.0+ are supported.

To run protection within a webpack bundle, add the protection code to `webpack.config.js`.

This example applies essential protection:

```
const {WebpackPlugin} = require('protect-web');
module.exports = {
    plugins : [
        new WebpackPlugin()
    ]
}
```

This example uses a blueprint. If you leave the code as is, it will apply essential protection. However, you can also modify the blueprint as described previously:

```
const {WebpackPlugin} = require('protect-web');
const blueprint = {
    guardConfigurations: {
        config : {
            "debugDetection": {
                "disable": true
            }
        }
    }
}
module.exports = {
    plugins : [
        new WebpackPlugin(blueprint)
    ]
}
```

To see the protection summary, add the ```stats``` field, as follows:

```
const {WebpackPlugin} = require('protect-web');
module.exports = {
    stats: {
        logging: 'log'
    },
    plugins : [
        new WebpackPlugin()
    ]
}
```

You can set the following values for ```logging```:
- none - disable logging
- log - displays errors, warnings, info messages, and log messages

**NOTE:** Multiple targets are not supported when protecting with Webpack.

**NOTE:** Blueprint target options (```input```, ```output```, ```stdin```, ```ignorePaths``` and ```validateIgnorePaths```) are overwritten with Webpack values.

You can also provide an `options` object, just like for the `protect` function described above.

When using Webpack and verbose setting in `options` object - the `stats` needs to be setup to see the output, as described above.

A modified example from above with a verbose output would look like this:

```
...
        new WebpackPlugin(blueprint, {verbose: true})
...
```

## License Setup

Instead of providing a license token as `PROTECT_LICENSE_TOKEN` variable, an alternative can be invoked to set up the
licensing, based on the operating system:

```npm explore protect-web -- npm run setup-linux -- --license-setup```

```npm explore protect-web -- npm run setup-mac -- --license-setup```

```npm explore protect-web -- npm run setup-windows -- --license-setup```

This will start an interactive licensing setup, which will then store the result for any future protections. This only
needs to be invoked once, before any protection.

Then provide `PROTECT_LICENSE_TOKEN` variable with a value of `setup` to tell protection that a license token was set up
this way:

```export PROTECT_LICENSE_TOKEN="setup"```

## Learn More

Visit www.digital.ai to learn more about Digital.ai protection solutions.
