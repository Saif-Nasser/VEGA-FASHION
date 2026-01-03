# Admin provisioning scripts

Use these scripts to securely promote users to admin status.

1. Create a Firebase service account and download the JSON key.
2. Set environment variable: `GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json`.
3. Promote a user by UID:

   ```bash
   node promote_user_to_admin.js <uid>
   ```

4. (Optional) Set a custom claim `admin: true` on a user so Firestore rules can allow writes by admin-only callers:

   ```bash
   node set_custom_claims.js <uid>
   ```

Notes:
- These scripts must be run from a secure environment (trusted machine/CI) with access to the service account JSON.
- After promoting, ensure Firestore rules allow admin-only writes based on `request.auth.token.admin` or manage `config/admins` via trusted servers only.

Additional helper:
- To quickly create a test user (email/password) from a trusted environment, use the `create_test_user.js` script:

  ```bash
  # Create a normal test account
  node create_test_user.js test+1@example.com Secur3P@ssw0rd

  # Create an admin test account (also sets custom claim `admin: true`)
  node create_test_user.js test+admin@example.com Secur3P@ssw0rd --admin
  ```
Migration of existing plaintext admin records:

- If you have older `config/adminCredentials` entries (emails + plaintext passwords), use the migration script to convert them to UID-based admin records (so the application uses Firebase Authentication correctly):

  ```bash
  # Run the migration (prints report). Requires service account creds.
  node migrate_admin_credentials.js

  # Create missing Auth users for emails that do not yet exist (prints generated passwords):
  node migrate_admin_credentials.js --create-missing

  # Optionally remove plaintext passwords from Firestore after verifying the migration:
  node migrate_admin_credentials.js --remove-plaintext
  ```

Processing admin requests from the UI:

- If you want site users (or a human operator) to submit admin creation requests from the UI (email + temporary password), the UI writes pending documents to the `adminRequests` collection. Process them from a trusted environment with:

  ```bash
  # Process pending admin requests: creates users (if missing), promotes them, and marks requests processed
  node process_admin_requests.js

  # Process and delete requests after processing
  node process_admin_requests.js --delete-requests
  ```

Security note: Pending requests contain temporary passwords; treat them as sensitive and remove or scrub them after processing (use `--delete-requests` when you are comfortable).
Important: Never commit real credentials or service account keys to source control; run the scripts locally or from a secured CI job.