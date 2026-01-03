// Create a test Firebase user using the Admin SDK.
// Usage:
//   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json
//   node create_test_user.js email@example.com password123 [--admin]

const admin = require('firebase-admin');

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('Error: Set GOOGLE_APPLICATION_CREDENTIALS to your service account JSON file');
  process.exit(1);
}

admin.initializeApp();

async function createUser(email, password, makeAdmin) {
  try {
    const userRecord = await admin.auth().createUser({
      email,
      password,
      emailVerified: false,
      disabled: false,
    });

    if (makeAdmin) {
      await admin.auth().setCustomUserClaims(userRecord.uid, { admin: true });
      console.log('Set admin custom claim for UID:', userRecord.uid);
    }

    console.log('\nCreated test user:');
    console.log('  email:', email);
    console.log('  password:', password);
    console.log('  uid:', userRecord.uid);
    console.log('\nIMPORTANT: Do NOT commit or share these credentials in source control.');
    return 0;
  } catch (err) {
    console.error('Failed to create user:', err.message || err);
    if (err.code === 'auth/email-already-exists') {
      console.error('A user with that email already exists. Try a different email.');
    }
    return 1;
  }
}

(async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('Usage: node create_test_user.js <email> <password> [--admin]');
    process.exit(1);
  }

  const email = args[0];
  const password = args[1];
  const makeAdmin = args.includes('--admin');

  const code = await createUser(email, password, makeAdmin);
  process.exit(code);
})();