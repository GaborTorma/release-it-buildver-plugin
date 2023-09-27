# release-it-buildver-plugin

## Build Versioning plugin for Release It!

This plugin enables Build Versioning with Release It!

```
npm install --save-dev @GaborTorma/release-it-buildver-plugin
```

Based on release-it default version plugin. Inspired by [release-it-calver-plugin](https://github.com/casmith/release-it-calver-plugin).

In [release-it](https://github.com/release-it/release-it) config:

```js
"plugins": {
  "@GaborTorma/release-it-buildver-plugin": {
    "versionArgs": [], // any args for yarn version
    "build": {  // prefix and suffix build versioning
      "prefix": "b", 
      "prefixSeparator": ".",
      "suffixSeparator": "-",
      "suffix": "live",
      "start": 1000, // start build version
    },
  }
}
"npm": {
  "publish": false,
  "allowSameVersion": true, // need to allow same version for build release
},

```

Version format: `major.minor.patch+buildmeta`

Build meta format: `prefix + prefixSeparator + build + suffixSeparator + suffix` 

#### Configuration examples:

##### Defaults
```js
{
  "versionArgs": [],
  "build": {
    "prefix": "build",
    "prefixSeparator": ".",
    "suffixSeparator": "-",
  },
}
```
##### Output when latestVersion is `1.1.0+build.0` 
```
1.1.0+build.1 // build version is incremented 
1.1.1+build.1 // patch version is incremented 
1.2.0+build.1 // minor version is incremented 
2.0.0+build.1 // major version is incremented 
1.1.1-0+build.1 // prepatch version is incremented 
1.2.0-0+build.1 // preminor version is incremented 
2.0.0-0+build.1 // premajor version is incremented 
```

##### Custom
```json
{
  "build": {
    "prefix": "b",
    "prefixSeparator": ".",
    "suffixSeparator": "-",
    "suffix": "prod",
    "start": 1000
  },
}
```
##### Output when latestVersion is `1.1.0`. Result will be chained.
```
1.1.0+b.1000-prod // build version is incremented based on 1.1.0
1.1.1-0+b.1001-prod // prepatch version is incremented based on 1.1.0+b.1000-prod
1.1.1+b.1002-prod // patch version is incremented based on 1.1.0+b.1001-prod
1.2.0-0+b.1003-prod // preminor version is incremented based on 1.1.1+b.1002-prod
1.2.0+b.1004-prod // minor version is incremented based on 1.2.0-0+b.1003-prod
2.0.0-0+b.1005-prod // premajor version is incremented based on 1.2.0+b.1004-prod
2.0.0+b.1006-prod // major version is incremented based on 2.0.0-0+b.1005-prod
```