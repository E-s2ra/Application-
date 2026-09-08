let RewardedAd: any = null;
let RewardedAdEventType: any = null;
let AdEventType: any = null;
let TestIds: any = null;
let isAvailable = false;

try {
  const GoogleMobileAds = require('react-native-google-mobile-ads');
  RewardedAd = GoogleMobileAds.RewardedAd;
  RewardedAdEventType = GoogleMobileAds.RewardedAdEventType;
  AdEventType = GoogleMobileAds.AdEventType;
  TestIds = GoogleMobileAds.TestIds;
  isAvailable = !!RewardedAd;
} catch (e) {
  console.log('[AdMobProxy] Native AdMob module not available in current binary (e.g. Expo Go). Falling back to simulated modal.');
  isAvailable = false;
}

export const AdMobProxy = {
  RewardedAd,
  RewardedAdEventType,
  AdEventType,
  TestIds,
  isAvailable,
};
