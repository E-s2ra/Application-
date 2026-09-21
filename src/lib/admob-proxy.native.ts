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
  console.warn('[AdMobProxy] Native AdMob module is unavailable in this binary; rewarded ads are disabled.');
  isAvailable = false;
}

export const AdMobProxy = {
  RewardedAd,
  RewardedAdEventType,
  AdEventType,
  TestIds,
  isAvailable,
};
