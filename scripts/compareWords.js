const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function compareWords() {
  const topicId = "4dc39cfe-a1da-4089-b32e-0c11a7c2a18c"; // Cybersecurity

  const wordsRef = db.collection("words").where("topic_id", "==", topicId);
  const snap = await wordsRef.get();
  
  const words = [];
  snap.forEach((doc) => {
    words.push({ id: doc.id, ...doc.data() });
  });

  // Sort by created_at to separate old vs new
  words.sort((a, b) => {
    if (a.created_at < b.created_at) return -1;
    if (a.created_at > b.created_at) return 1;
    return 0;
  });

  if (words.length > 0) {
    console.log("=== OLD WORD (Should be showing in app) ===");
    console.log(JSON.stringify(words[0], null, 2));

    console.log("\n=== NEW WORD (Imported, not showing) ===");
    console.log(JSON.stringify(words[words.length - 1], null, 2));
  } else {
    console.log("No words found.");
  }
}

compareWords().catch(console.error).finally(() => process.exit(0));
