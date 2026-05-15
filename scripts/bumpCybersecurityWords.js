const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function bumpCybersecurityWords() {
  const topicId = '4dc39cfe-a1da-4089-b32e-0c11a7c2a18c';
  const newVersion = 2;

  // 1. Update system/contentVersion
  await db.collection("system").doc("contentVersion").set({
    wordsVersion: newVersion,
    lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
  console.log(`✅ Bumped system wordsVersion to ${newVersion}`);

  // 2. Backfill Words for the specific topic
  const wordsSnap = await db.collection("words").where("topic_id", "==", topicId).get();
  
  if (wordsSnap.empty) {
    // Try a_topic_id fallback
    const wordsFallbackSnap = await db.collection("words").where("a_topic_id", "==", topicId).get();
    if (!wordsFallbackSnap.empty) {
        let count = 0;
        const batch = db.batch();
        for (const doc of wordsFallbackSnap.docs) {
            batch.update(doc.ref, { contentVersion: newVersion });
            count++;
        }
        await batch.commit();
        console.log(`✅ Bumped contentVersion to ${newVersion} for ${count} words using a_topic_id.`);
        return;
    }
    console.log("No words found for Cybersecurity topic.");
    return;
  }

  let count = 0;
  let batch = db.batch();
  
  for (const doc of wordsSnap.docs) {
    batch.update(doc.ref, { contentVersion: newVersion });
    count++;
  }
  
  await batch.commit();
  console.log(`✅ Bumped contentVersion to ${newVersion} for ${count} Cybersecurity words.`);
}

bumpCybersecurityWords().catch(console.error).finally(() => process.exit(0));
