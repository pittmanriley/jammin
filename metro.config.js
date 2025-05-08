const { getDefaultConfig } = require("@expo/metro-config");

const defaultConfig = getDefaultConfig(__dirname);

// ✅ Fix Firebase package export resolution issue
defaultConfig.resolver.unstable_enablePackageExports = false;

module.exports = defaultConfig;
