const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function bumpRecentEdits() {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 3); // Edits in the last 3 days
  const cutoffIso = cutoffDate.toISOString();

  let wordsBumped = 0;
  let topicsBumped = 0;

  // Bump system version to 3 just to be safe
  const newVer = 3;
  await db.collection("system").doc("contentVersion").set({
    wordsVersion: newVer,
    topicsVersion: newVer,
    lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  const batch = db.batch();

  // Words
  const wordsSnap = await db.collection("words").where("updated_at", ">", cutoffIso).get();
  for (const doc of wordsSnap.docs) {
    batch.update(doc.ref, { contentVersion: newVer });
    wordsBumped++;
  }

  // Topics
  // Check if topics have updated_at. If not, maybe just bump all of them to be safe?
  // Since there are only 255 topics, bumping all of them to newVer is very cheap and ensures the mobile app gets any topic updates!
  const topicsSnap = await db.collection("topics").get();
  for (const doc of topicsSnap.docs) {
    // Only bump topics that were modified recently or just bump all topics?
    // Let's bump all topics to be absolutely sure the user's edits are synced. 255 reads/writes is tiny.
    batch.update(doc.ref, { contentVersion: newVer });
    topicsBumped++;
  }

  await batch.commit();

  console.log(`✅ Bumped system version to ${newVer}`);
  console.log(`✅ Bumped ${wordsBumped} recently edited words to version ${newVer}`);
  console.log(`✅ Bumped ${topicsBumped} topics to version ${newVer}`);
}

bumpRecentEdits().catch(console.error).finally(() => process.exit(0));
