const { withProjectBuildGradle } = require('expo/config-plugins');

module.exports = function withKotlinVersion(config, version) {
  return withProjectBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      let buildGradle = config.modResults.contents;
      if (!buildGradle.includes('ext.kotlinVersion')) {
        buildGradle = buildGradle.replace(
          /buildscript\s*\{/,
          `buildscript {\n    ext { kotlinVersion = "${version}" }`
        );
      } else {
        buildGradle = buildGradle.replace(
          /kotlinVersion\s*=\s*['"].*['"]/,
          `kotlinVersion = "${version}"`
        );
      }
      config.modResults.contents = buildGradle;
    }
    return config;
  });
};
