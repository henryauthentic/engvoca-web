const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function resetPendingRelease() {
  // Reset pendingRelease since all words already have real contentVersion (not 0)
  await db.collection("system").doc("pendingRelease").set({
    pendingWordsCount: 0,
    pendingTopicsCount: 0,
    changesSummary: [],
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });
  console.log("✅ Reset system/pendingRelease to 0");

  // Verify
  const doc = await db.collection("system").doc("pendingRelease").get();
  console.log("Current state:", doc.data());
}

resetPendingRelease().catch(console.error).finally(() => process.exit(0));
