module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // react-native-worklets/plugin MUST be last (Reanimated v4).
    plugins: ['react-native-worklets/plugin'],
  };
};
