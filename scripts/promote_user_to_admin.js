/*
Promote an existing Firebase Auth user to an admin by adding their UID
into Firestore document `config/admins` -> { uids: [ ... ] }.

Usage (requires GOOGLE_APPLICATION_CREDENTIALS env var pointing to a service account):
  node promote_user_to_admin.js <uid>

This script uses the Admin SDK to write to Firestore reliably. Keep the
service account secure and run this from a trusted environment.
*/

const admin = require('firebase-admin');
const fs = require('fs');

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('Set GOOGLE_APPLICATION_CREDENTIALS to your service account JSON file');
  process.exit(1);
}

admin.initializeApp();
const db = admin.firestore();

async function promote(uid) {
  const docRef = db.collection('config').doc('admins');
  const doc = await docRef.get();
  let uids = [];
  if (doc.exists) uids = doc.data().uids || [];
  if (!uids.includes(uid)) {
    uids.push(uid);
    await docRef.set({ uids });
    console.log('Promoted UID to admin:', uid);
  } else {
    console.log('UID already an admin:', uid);
  }
}

(async () => {
  const uid = process.argv[2];
  if (!uid) {
    console.error('Usage: node promote_user_to_admin.js <uid>');
    process.exit(1);
  }
  try {
    await promote(uid);
    process.exit(0);
  } catch (err) {
    console.error('Error promoting user:', err);
    process.exit(1);
  }
})();
