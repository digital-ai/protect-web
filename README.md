# Digital.ai Web App Protection Installation Manager

Integrate Digital.ai protection into your npm or webpack workflow.

## Prerequisites

Before you can install or use this package, you must:

1. Be a current Digital.ai customer.
2. Review the platform requirements in the most recent version of the *Digital.ai Web App Protection* online help, which is available from Digital.ai.
3. Obtain an API Key, API Secret, and License Token from Digital.ai.
    * Make sure the API Key has the "Product download" checkbox checked.
4. Add the following environment variables:
    * `PROTECT_LICENSE_REGION` variable is optional, the default region is "NorthAmerica".

```
PROTECT_API_KEY="myapikey"
PROTECT_API_SECRET="mysecret"
PROTECT_LICENSE_TOKEN="mylicensetoken"
PROTECT_LICENSE_REGION="myregion"
```

**NOTE:** PROTECT_LICENSE_TOKEN can be setup after the package has been installed.

**NOTE:** PROTECT_API_KEY, PROTECT_API_SECRET and PROTECT_LICENSE_REGION can be setup before the package has been installed, or after. If they are setup after the package has been installed, then the package dependencies will be downloaded the first time the protection is run. Otherwise, the package dependencies are downloaded during the package installation.

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
            "outputDirectory": "./dist_protected"
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

Notice the object called `blueprint`. To apply essential protection, you only need to modify the values of `"input"` and `"outputDirectory"`, where `"./dist"` is the directory that contains your input files and `"./dist_protected"` is the directory where the final protected files will appear.

However, you can further customize your protection by modifying the `blueprint` object. For instructions, see the *Digital.ai Web App Protection* online help, which is available from Digital.ai.


### Protect with Webpack

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

**NOTE:** Blueprint target options (```input```, ```outputDirectory```, ```outputFile```, ```stdin```, ```ignorePaths``` and ```validateIgnorePaths```) are overwritten with Webpack values.

## Learn More

Visit www.digital.ai to learn more about Digital.ai protection solutions.
