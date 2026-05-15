const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function backfill() {
  const wordsRef = db.collection("words");
  const snap = await wordsRef.get();
  let count = 0;

  const batch = db.batch();
  
  snap.forEach((doc) => {
    const data = doc.data();
    if (!data.updated_at) {
      batch.update(doc.ref, {
        updated_at: data.created_at || new Date().toISOString()
      });
      count++;
    }
  });

  if (count > 0) {
    await batch.commit();
    console.log(`Successfully backfilled updated_at for ${count} words.`);
  } else {
    console.log("All words already have updated_at. Nothing to do.");
  }
}

backfill().catch(console.error).finally(() => process.exit(0));
