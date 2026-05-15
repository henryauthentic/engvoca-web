const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function initSchemaVersion() {
  const ref = db.collection("system").doc("contentVersion");
  
  await ref.set({
    schemaVersion: 1,
    latestUpdateType: 'patch',
    latestUpdateTitle: 'Khởi tạo hệ thống',
    latestUpdateDescription: 'Hệ thống Smart Update đã sẵn sàng',
    lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  console.log("✅ Initialized Smart Sync fields in system/contentVersion");
}

initSchemaVersion().catch(console.error).finally(() => process.exit(0));
