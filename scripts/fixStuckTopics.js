const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function fixStuckTopics() {
  const auditSnap = await db.collection("adminLogs")
    .where("action", "==", "DELETE_TOPIC")
    .get();

  console.log(`Found ${auditSnap.size} DELETE_TOPIC logs in adminLogs.`);

  let fixedCount = 0;
  for (const doc of auditSnap.docs) {
    const data = doc.data();
    const topicId = data.targetId;
    const name = data.details?.name || "unknown";
    
    // Check if it's one of the stuck ones "TECHNOLOGY"
    if (!name.toUpperCase().includes("TECHNOLOGY")) {
       continue;
    }
    
    const topicRef = db.collection("topics").doc(topicId);
    const topicSnap = await topicRef.get();
    
    if (!topicSnap.exists) {
      console.log(`Recreating ghost for hard-deleted topic: ${name} (${topicId})`);
      
      // Get current topicsVersion to bump it
      const sysDoc = await db.collection("system").doc("pendingRelease").get();
      const currentTopicsVer = sysDoc.exists ? (sysDoc.data().topicsVersion || 1) : 1;
      const newVer = currentTopicsVer + 1;

      await topicRef.set({
        id: topicId,
        name: name,
        deleted: true,
        deletedAt: new Date().toISOString(),
        deletedBy: data.adminUid || "system",
        contentVersion: newVer // Force mobile app to download this update
      });
      
      // Bump system topicsVersion so mobile app pulls the delta
      await db.collection("system").doc("contentVersion").set({
        topicsVersion: newVer,
        lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      
      fixedCount++;
    } else {
      console.log(`Topic ${name} still exists in DB, skipping.`);
    }
  }
  
  console.log(`Fixed ${fixedCount} stuck topics.`);
}

fixStuckTopics().catch(console.error).finally(() => process.exit(0));
