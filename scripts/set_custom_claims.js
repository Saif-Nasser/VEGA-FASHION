/*
Set a custom admin claim on a Firebase user. Requires service account credentials
and Firebase Admin SDK.

Usage:
  node set_custom_claims.js <uid>

This sets the custom claim `admin: true` for the specified user.
*/

const admin = require('firebase-admin');

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('Set GOOGLE_APPLICATION_CREDENTIALS to your service account JSON file');
  process.exit(1);
}

admin.initializeApp();

async function setAdminClaim(uid) {
  await admin.auth().setCustomUserClaims(uid, { admin: true });
  console.log('Set admin custom claim for UID:', uid);
}

(async () => {
  const uid = process.argv[2];
  if (!uid) {
    console.error('Usage: node set_custom_claims.js <uid>');
    process.exit(1);
  }
  try {
    await setAdminClaim(uid);
    process.exit(0);
  } catch (err) {
    console.error('Error setting custom claim:', err);
    process.exit(1);
  }
})();