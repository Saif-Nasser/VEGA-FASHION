# Pre-deploy checklist — Backend security & readiness ✅

Follow these steps before deploying the app to production:

1. Admin provisioning
   - DO NOT add admin accounts client-side. Use the scripts in `scripts/` from a trusted machine.
   - Promote a user by UID:
     ```bash
     export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
     node scripts/promote_user_to_admin.js <uid> [email]
     ```
   - (Optional) Set a custom claim `admin: true` on the user:
     ```bash
     node scripts/set_custom_claims.js <uid>
     ```

2. Firestore rules
   - Review and deploy `firestore.rules`. It restricts writes to `config/admins` to callers with custom claim `admin: true`.
   - Test the rules using the Firebase Emulator or `firebase rules:test`.

3. Secrets & config
   - Ensure your service account keys and any private credentials are kept out of the repository and stored in a secure secret manager or CI secrets.

4. Code checks
   - Run a syntax check and lint pass on all JavaScript files.
   - Run any unit/integration tests you have.

5. Smoke tests
   - Use the Firebase Emulator Suite for Firestore and Auth to do a full roundtrip test of sign-up, login, admin promotion, and admin-only flows.
   - (Optional) A lightweight admin UI exists at `admin-setup.html` to let existing admins add other users by email (it resolves email → uid via the `users` collection and appends the uid to `config/admins.uids`).
   - If your project has legacy `config/adminCredentials` entries (emails + plaintext passwords), use `node scripts/migrate_admin_credentials.js` to convert them to UID-based admin records.
   - Run `node scripts/migrate_admin_credentials.js --create-missing` to create missing Auth users for those emails (prints generated passwords).


6. Monitoring & backups
   - Enable monitoring/alerts for your Firebase project and set up regular backups for Firestore if needed.

If you'd like, I can scaffold CI steps (GitHub Actions) to run lint, tests, and emulator-based integration tests on pull requests.