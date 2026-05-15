const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function verifyData() {
  // Count ALL words
  const wordsSnap = await db.collection("words").get();
  console.log(`📊 Tổng số words trong Firestore: ${wordsSnap.size}`);

  // Count ALL topics  
  const topicsSnap = await db.collection("topics").get();
  console.log(`📊 Tổng số topics trong Firestore: ${topicsSnap.size}`);

  // Show contentVersion distribution for ALL words
  const versionCounts = {};
  wordsSnap.docs.forEach(doc => {
    const cv = doc.data().contentVersion;
    const key = cv === undefined ? "UNDEFINED" : String(cv);
    versionCounts[key] = (versionCounts[key] || 0) + 1;
  });
  console.log("\n📦 Phân bố contentVersion (words):", versionCounts);

  // Show last 10 created words
  console.log("\n📝 10 từ mới nhất:");
  const recent = wordsSnap.docs
    .filter(d => d.data().created_at)
    .sort((a, b) => (b.data().created_at || "").localeCompare(a.data().created_at || ""))
    .slice(0, 10);
  recent.forEach(doc => {
    const d = doc.data();
    console.log(`  - ${d.word} (cv=${d.contentVersion}, created=${d.created_at})`);
  });
}

verifyData().catch(console.error).finally(() => process.exit(0));
