const { parse } = require('expo-linking');
console.log(parse('aniflix://reset-password'));
console.log(parse('aniflix:///reset-password'));
console.log(parse('aniflix://app/reset-password'));
