/**
 * ═══════════════════════════════════════════════════════════
 * SETUP ADMIN ROLE — One-time script
 * ═══════════════════════════════════════════════════════════
 *
 * Usage:
 *   node scripts/setupAdmin.js
 *
 * Prerequisites:
 *   1. Place your Firebase service account key at:
 *      scripts/serviceAccountKey.json
 *   2. Install firebase-admin: npm install firebase-admin
 */

const admin = require("firebase-admin");
const path = require("path");

// Load service account key
const serviceAccount = require(path.join(__dirname, "serviceAccountKey.json"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const ADMIN_UID = "o9N7KROmJKg4ZI7EYiRoPE1mK8w1";
const ADMIN_EMAIL = "hieu77095@gmail.com";

async function setupAdmin() {
  console.log("🛡️  Setting up admin role...\n");

  try {
    // 1. Set role: "admin" on user document
    await db.doc(`users/${ADMIN_UID}`).update({
      role: "admin",
    });
    console.log(`✅ Set role: "admin" for user ${ADMIN_EMAIL} (${ADMIN_UID})`);

    // 2. Create system/contentVersion document
    await db.doc("system/contentVersion").set(
      {
        wordsVersion: 0,
        topicsVersion: 0,
        lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    console.log("✅ Created system/contentVersion document");

    // 3. Create system/config document
    await db.doc("system/config").set(
      {
        maintenanceMode: false,
        defaultDailyGoal: 15,
      },
      { merge: true }
    );
    console.log("✅ Created system/config document");

    // 4. Create system/featureFlags document
    await db.doc("system/featureFlags").set(
      {
        betaAIDictionary: true,
        premiumContent: false,
      },
      { merge: true }
    );
    console.log("✅ Created system/featureFlags document");

    console.log("\n🎉 Admin setup complete! You can now access /admin");
  } catch (err) {
    console.error("❌ Error:", err.message);
  }

  process.exit(0);
}

setupAdmin();
