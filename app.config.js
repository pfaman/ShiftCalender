// Firebase (Analytics, Crashlytics, push) is switched on only when the Firebase project's
// google-services.json sits next to this file. Without it the app builds and runs normally,
// and src/telemetry.ts quietly does nothing.
const fs = require('fs');
const base = require('./app.json').expo;

module.exports = () => {
  const hasFirebase = fs.existsSync('./google-services.json');
  if (!hasFirebase) return base;
  return {
    ...base,
    android: { ...base.android, googleServicesFile: './google-services.json' },
    plugins: [...base.plugins, '@react-native-firebase/app', '@react-native-firebase/crashlytics'],
  };
};
