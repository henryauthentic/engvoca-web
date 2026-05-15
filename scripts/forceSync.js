const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function forceSyncTopic() {
  const topicId = "4dc39cfe-a1da-4089-b32e-0c11a7c2a18c"; // Cybersecurity

  // 1. Update updated_at for all words in this topic
  const wordsRef = db.collection("words").where("topic_id", "==", topicId);
  const snap = await wordsRef.get();
  
  let count = 0;
  const batch = db.batch();
  
  const now = new Date().toISOString();
  
  snap.forEach((doc) => {
    batch.update(doc.ref, {
      updated_at: now
    });
    count++;
  });

  if (count > 0) {
    await batch.commit();
    console.log(`Updated updated_at to ${now} for ${count} words in Cybersecurity.`);
  }

  // 2. Bump system/contentVersion
  await db.collection("system").doc("contentVersion").set({
    wordsVersion: admin.firestore.FieldValue.increment(1),
    lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
  
  console.log("Bumped wordsVersion in system/contentVersion.");
}

forceSyncTopic().catch(console.error).finally(() => process.exit(0));
