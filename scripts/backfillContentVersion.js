const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function backfillContentVersion() {
  const version = 1;

  // 1. Initialize system/contentVersion
  await db.collection("system").doc("contentVersion").set({
    wordsVersion: version,
    topicsVersion: version,
    schemaVersion: 1, // Future proofing
    lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
  });
  console.log("✅ Initialized system/contentVersion");

  // 2. Backfill Topics
  const topicsSnap = await db.collection("topics").get();
  let topicCount = 0;
  let batch = db.batch();
  
  for (const doc of topicsSnap.docs) {
    batch.update(doc.ref, { contentVersion: version });
    topicCount++;
    
    if (topicCount % 400 === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }
  if (topicCount % 400 !== 0) await batch.commit();
  console.log(`✅ Backfilled contentVersion for ${topicCount} topics.`);

  // 3. Backfill Words
  const wordsSnap = await db.collection("words").get();
  let wordCount = 0;
  batch = db.batch();
  
  for (const doc of wordsSnap.docs) {
    batch.update(doc.ref, { 
      contentVersion: version,
      deleted: doc.data().deleted || false // Ensure deleted flag exists
    });
    wordCount++;
    
    if (wordCount % 400 === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }
  if (wordCount % 400 !== 0) await batch.commit();
  console.log(`✅ Backfilled contentVersion for ${wordCount} words.`);

  console.log("🎉 All data backfilled successfully!");
}

backfillContentVersion().catch(console.error).finally(() => process.exit(0));
