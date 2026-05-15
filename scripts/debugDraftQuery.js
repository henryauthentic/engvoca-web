const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function debugDraft() {
  // 1. Check what contentVersion values exist in words
  console.log("=== Checking contentVersion distribution in 'words' ===");
  const wordsSnap = await db.collection("words").limit(500).get();
  const versionCounts = {};
  wordsSnap.docs.forEach(doc => {
    const cv = doc.data().contentVersion;
    const key = cv === undefined ? "UNDEFINED" : cv === null ? "NULL" : String(cv);
    versionCounts[key] = (versionCounts[key] || 0) + 1;
  });
  console.log("Version distribution:", versionCounts);

  // 2. Specifically query for contentVersion == 0
  console.log("\n=== Query: contentVersion == 0 ===");
  const zeroSnap = await db.collection("words").where("contentVersion", "==", 0).limit(10).get();
  console.log(`Found ${zeroSnap.size} words with contentVersion == 0`);
  zeroSnap.docs.forEach(doc => {
    console.log(`  - ${doc.data().word}: cv=${doc.data().contentVersion}`);
  });

  // 3. Check topics too
  console.log("\n=== Checking contentVersion in 'topics' ===");
  const topicsSnap = await db.collection("topics").get();
  const topicVersions = {};
  topicsSnap.docs.forEach(doc => {
    const cv = doc.data().contentVersion;
    const key = cv === undefined ? "UNDEFINED" : cv === null ? "NULL" : String(cv);
    topicVersions[key] = (topicVersions[key] || 0) + 1;
  });
  console.log("Topic version distribution:", topicVersions);

  // 4. Check pendingRelease document
  console.log("\n=== system/pendingRelease ===");
  const pendingDoc = await db.collection("system").doc("pendingRelease").get();
  console.log(pendingDoc.exists ? pendingDoc.data() : "Document does not exist");
}

debugDraft().catch(console.error).finally(() => process.exit(0));
