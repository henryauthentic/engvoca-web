const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function debugSync() {
  const topicsRef = db.collection("topics");
  const topicsSnap = await topicsRef.get();
  console.log("--- TOPICS ---");
  topicsSnap.forEach(doc => {
    const data = doc.data();
    if (data.name.toLowerCase().includes("cyber")) {
      console.log(`Topic ID: ${doc.id}, Name: ${data.name}, Parent: ${data.parent_id}, Words: ${data.total_words}`);
    }
  });

  console.log("\n--- RECENT WORDS ---");
  const wordsRef = db.collection("words").orderBy("updated_at", "desc").limit(10);
  const wordsSnap = await wordsRef.get();
  wordsSnap.forEach(doc => {
    const data = doc.data();
    console.log(`Word: ${data.word}, Topic ID: ${data.topic_id}, updated_at: ${data.updated_at}`);
  });
}

debugSync().catch(console.error).finally(() => process.exit(0));
