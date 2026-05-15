const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function forceBumpTopics() {
  const newVer = 100; // Force a high version to ensure all phones sync
  
  // Bump ghost topics
  const ids = ["DDpyjpQ7Z96YP4erh3ro", "FLsUC52LEqYfYpsfDwVK"];
  for (const id of ids) {
    await db.collection("topics").doc(id).update({
      contentVersion: newVer
    });
    console.log(`Updated topic ${id} to version ${newVer}`);
  }
  
  // Bump system version
  await db.collection("system").doc("contentVersion").set({
    topicsVersion: newVer,
    lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
  
  console.log(`System topicsVersion bumped to ${newVer}`);
}

forceBumpTopics().catch(console.error).finally(() => process.exit(0));
