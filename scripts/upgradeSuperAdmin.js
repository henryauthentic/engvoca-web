/**
 * Upgrade admin role to superadmin — one-time script
 * Usage: node scripts/upgradeSuperAdmin.js
 */

const admin = require("firebase-admin");
const path = require("path");

const serviceAccount = require(path.join(__dirname, "serviceAccountKey.json"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const ADMIN_UID = "o9N7KROmJKg4ZI7EYiRoPE1mK8w1";

async function upgrade() {
  console.log("👑 Upgrading to superadmin...\n");

  await db.doc(`users/${ADMIN_UID}`).update({
    role: "superadmin",
  });

  console.log(`✅ Set role: "superadmin" for UID ${ADMIN_UID}`);
  console.log("\n🎉 Done! Reload the Web Admin to see the changes.");
  process.exit(0);
}

upgrade();
