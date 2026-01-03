// Process pending adminRequests documents and create Auth users and admin entries.
// Usage:
//   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json
//   node process_admin_requests.js [--delete-requests]
//
// --delete-requests : after processing, delete the adminRequests documents that were processed (default: leave them for audit)

const admin = require('firebase-admin');

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('Error: Set GOOGLE_APPLICATION_CREDENTIALS to your service account JSON file');
  process.exit(1);
}

admin.initializeApp();
const db = admin.firestore();

(async function main() {
  const args = process.argv.slice(2);
  const deleteRequests = args.includes('--delete-requests');

  try {
    const q = await db.collection('adminRequests').where('status', '==', 'pending').get();
    if (q.empty) { console.log('No pending admin requests'); process.exit(0); }

    const processed = [];

    for (const doc of q.docs) {
      const data = doc.data();
      const email = data.email;
      const password = data.password;

      if (!email || !password) {
        console.log('Skipping request with missing fields:', doc.id);
        await doc.ref.update({ status: 'invalid', note: 'missing email or password', processedAt: new Date().toISOString() });
        continue;
      }

      // Check if user exists
      let uid;
      try {
        const user = await admin.auth().getUserByEmail(email);
        uid = user.uid;
        console.log('Existing user found for', email, 'uid=', uid);
      } catch (err) {
        if (err.code === 'auth/user-not-found') {
          // Create the user
          try {
            const newUser = await admin.auth().createUser({ email, password, emailVerified: false, disabled: false });
            uid = newUser.uid;
            console.log('Created user for', email, 'uid=', uid);
          } catch (createErr) {
            console.error('Failed to create user for', email, createErr.message || createErr);
            await doc.ref.update({ status: 'failed', note: 'create-failed: ' + (createErr.message || createErr), processedAt: new Date().toISOString() });
            continue;
          }
        } else {
          console.error('Failed to lookup user for', email, err.message || err);
          await doc.ref.update({ status: 'failed', note: 'lookup-failed: ' + (err.message || err), processedAt: new Date().toISOString() });
          continue;
        }
      }

      // Add admin entry to config/admins (uid-based)
      const adminsRef = db.collection('config').doc('admins');
      await db.runTransaction(async (tx) => {
        const d = await tx.get(adminsRef);
        const list = d.exists && Array.isArray(d.data().uids) ? d.data().uids.slice() : [];
        if (!list.includes(uid)) list.push(uid);
        tx.set(adminsRef, { uids: list }, { merge: true });
      });

      // Optionally set custom claim 'admin' (uncomment if you prefer custom claims too)
      try {
        await admin.auth().setCustomUserClaims(uid, { admin: true });
      } catch (claimErr) {
        console.warn('Could not set custom claim for', uid, claimErr.message || claimErr);
      }

      // Mark request processed
      await doc.ref.update({ status: 'processed', processedAt: new Date().toISOString(), uid });
      processed.push({ email, uid, reqId: doc.id });
    }

    console.log('\nProcessed requests:', processed.length);
    processed.forEach(p => console.log(p));

    if (deleteRequests) {
      for (const p of processed) {
        await db.collection('adminRequests').doc(p.reqId).delete();
        console.log('Deleted request', p.reqId);
      }
    }

    console.log('\nDone. Verify `config/admins` and remove any plaintext credentials or old `adminCredentials` doc when ready.');
    process.exit(0);
  } catch (err) {
    console.error('Processing failed:', err.message || err);
    process.exit(1);
  }
})();