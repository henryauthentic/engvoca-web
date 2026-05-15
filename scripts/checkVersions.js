const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function checkVersions() {
  const sysDoc = await db.collection("system").doc("contentVersion").get();
  console.log("system/contentVersion:", sysDoc.data());
  
  const sysPending = await db.collection("system").doc("pendingRelease").get();
  console.log("system/pendingRelease:", sysPending.data());

  const t1 = await db.collection("topics").doc("DDpyjpQ7Z96YP4erh3ro").get();
  console.log("Topic 1 (tét):", t1.data());

  const t2 = await db.collection("topics").doc("FLsUC52LEqYfYpsfDwVK").get();
  console.log("Topic 2 (test):", t2.data());
}

checkVersions().catch(console.error).finally(() => process.exit(0));
