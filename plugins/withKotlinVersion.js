const { withProjectBuildGradle } = require('expo/config-plugins');

module.exports = function withKotlinVersion(config, version) {
  return withProjectBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      let buildGradle = config.modResults.contents;

      // 1. Inject ext { kotlinVersion = "..." } right after buildscript {
      if (!buildGradle.includes('ext.kotlinVersion') && !buildGradle.includes('ext {')) {
        buildGradle = buildGradle.replace(
          /buildscript\s*\{/,
          `buildscript {\n    ext { kotlinVersion = "${version}" }`
        );
      }

      // 2. Pin the kotlin-gradle-plugin classpath to the exact version
      //    (Expo generates it without a version, relying on the version catalog)
      buildGradle = buildGradle.replace(
        /classpath\(\s*['"]org\.jetbrains\.kotlin:kotlin-gradle-plugin['"]\s*\)/,
        `classpath('org.jetbrains.kotlin:kotlin-gradle-plugin:${version}')`
      );

      config.modResults.contents = buildGradle;
    }
    return config;
  });
};
