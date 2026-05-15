const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function checkAnnouncements() {
  const snapshot = await db.collection("announcements").get();
  console.log(`Found ${snapshot.docs.length} announcements`);
  snapshot.docs.forEach((doc) => {
    console.log(doc.id, doc.data().title);
  });
  process.exit(0);
}

checkAnnouncements().catch(console.error);
