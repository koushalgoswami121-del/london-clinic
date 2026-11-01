// Run locally only, never in the browser or commit the service-account key.
const admin = require("firebase-admin");
const serviceAccount = require("./service-account.json");

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

async function main() {
  const email = process.argv[2];
  if (!email) throw new Error("Usage: node admin-set-claim.js staff@example.com");
  const user = await admin.auth().getUserByEmail(email);
  await admin.auth().setCustomUserClaims(user.uid, { admin: true });
  console.log(`Granted admin dashboard access to ${email}. Ask the user to sign out and back in.`);
}
main().catch(error => { console.error(error); process.exit(1); });
