// Migrate admin credentials stored in Firestore under `config/adminCredentials` (emails + plaintext passwords)
// into `config/admins` which contains { uids: [<uid>, ...] }.
// Usage:
//   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json
//   node migrate_admin_credentials.js [--create-missing] [--remove-plaintext]
//
// Options:
//   --create-missing  : create Auth users for emails that do not exist; prints their generated password
//   --remove-plaintext: after successful migration, remove plaintext admin credentials from Firestore

const admin = require('firebase-admin');
const crypto = require('crypto');

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('Error: Set GOOGLE_APPLICATION_CREDENTIALS to your service account JSON file');
  process.exit(1);
}

admin.initializeApp();
const db = admin.firestore();

function genPass() {
  return crypto.randomBytes(8).toString('base64').replace(/[^A-Za-z0-9]/g, '').slice(0, 12);
}

(async function main() {
  const args = process.argv.slice(2);
  const createMissing = args.includes('--create-missing');
  const removePlaintext = args.includes('--remove-plaintext');

  try {
    const cfgRef = db.collection('config').doc('adminCredentials');
    const snap = await cfgRef.get();
    if (!snap.exists) {
      console.error('No `config/adminCredentials` document found. Nothing to migrate.');
      process.exit(1);
    }

    const data = snap.data();
    const admins = Array.isArray(data.admins) ? data.admins : [];
    if (admins.length === 0) {
      console.error('`adminCredentials` has no entries. Nothing to migrate.');
      process.exit(1);
    }

    console.log('Found', admins.length, 'admin credential entries. Processing...');

    const resultUids = [];
    const missing = [];
    const created = [];

    for (const entry of admins) {
      const email = (entry && entry.email) ? String(entry.email).toLowerCase() : null;
      if (!email) continue;
      try {
        const user = await admin.auth().getUserByEmail(email);
        console.log('Found existing user for', email, 'uid=', user.uid);
        resultUids.push(user.uid);
      } catch (err) {
        if (err.code === 'auth/user-not-found') {
          console.log('No Auth user for', email);
          missing.push(email);
          if (createMissing) {
            const password = genPass();
            try {
              const newUser = await admin.auth().createUser({ email, password, emailVerified: false, disabled: false });
              console.log('Created user for', email, 'uid=', newUser.uid);
              resultUids.push(newUser.uid);
              created.push({ email, uid: newUser.uid, password });
            } catch (createErr) {
              console.error('Failed to create user for', email, createErr.message || createErr);
            }
          }
        } else {
          console.error('Error fetching user by email', email, err.message || err);
        }
      }
    }

    // Write the resulting uids to config/admins
    const adminsRef = db.collection('config').doc('admins');
    await adminsRef.set({ uids: resultUids }, { merge: true });
    console.log('\nMigrated admin UIDs written to config/admins:', resultUids.length, 'uids');

    if (missing.length > 0) console.log('\nEmails with no Auth user found:', missing);
    if (created.length > 0) {
      console.log('\nCreated users for missing emails (email, uid, password):');
      created.forEach(c => console.log(c.email, c.uid, c.password));
      console.log('\nIMPORTANT: Do not commit these credentials. Communicate them to the users securely, and prompt them to change their password on first login.');
    }

    if (removePlaintext) {
      // Back up the existing doc first
      const backupRef = db.collection('config').doc('adminCredentials_backup_' + Date.now());
      await backupRef.set(data);
      // Remove plaintext passwords from adminCredentials doc: keep emails only (or delete doc entirely)
      await cfgRef.set({ admins: admins.map(a => ({ email: a.email, createdAt: a.createdAt || new Date().toISOString() })) });
      console.log('\nBacked up original adminCredentials and removed plaintext passwords.');
    }

    console.log('\nMigration complete. Please verify `config/admins` and remove any plaintext credentials from Firestore when ready.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err.message || err);
    process.exit(1);
  }
})();