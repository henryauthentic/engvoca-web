const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function findDeletedTopics() {
  const auditSnap = await db.collection("auditLogs").get();

  console.log(`Searching ${auditSnap.size} audit logs for 'TECHNOLOGY'...`);

  for (const doc of auditSnap.docs) {
    const data = doc.data();
    if (JSON.stringify(data).includes("TECHNOLOGY")) {
       console.log("Found log:", doc.id, data);
    }
  }
}

findDeletedTopics().catch(console.error).finally(() => process.exit(0));
