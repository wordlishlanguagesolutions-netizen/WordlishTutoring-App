// Use Expo's default Metro configuration without privileged runtime imports
// or filesystem operations during configuration loading.
const { getDefaultConfig } = require('expo/metro-config');

module.exports = getDefaultConfig(__dirname);
