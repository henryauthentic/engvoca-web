const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function debugTechTopics() {
  // 1. Find TECHNOLOGY parent topic
  const topicsSnap = await db.collection("topics").get();
  const allTopics = topicsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  
  const techParent = allTopics.find(t => t.name === "TECHNOLOGY" && !t.parent_id);
  console.log("TECHNOLOGY parent:", techParent?.id, "total_words:", techParent?.total_words);
  
  // 2. Find all sub-topics of TECHNOLOGY
  const techChildren = allTopics.filter(t => t.parent_id === techParent?.id);
  console.log(`\nFound ${techChildren.length} sub-topics:`);
  
  for (const child of techChildren) {
    // Count actual words with this topic_id
    const wordsSnap = await db.collection("words")
      .where("topic_id", "==", child.id)
      .get();
    
    console.log(`  ${child.name} (${child.id})`);
    console.log(`    -> total_words field: ${child.total_words || 0}`);
    console.log(`    -> actual words in DB: ${wordsSnap.size}`);
    if (wordsSnap.size > 0) {
      const sample = wordsSnap.docs[0].data();
      console.log(`    -> sample word: "${sample.word}" (cv=${sample.contentVersion})`);
    }
  }
  
  // 3. Check if there are words with TECHNOLOGY parent ID as topic_id (wrong assignment)
  const wrongWords = await db.collection("words")
    .where("topic_id", "==", techParent?.id)
    .get();
  console.log(`\nWords assigned to PARENT topic (wrong): ${wrongWords.size}`);
  if (wrongWords.size > 0) {
    wrongWords.docs.slice(0, 5).forEach(d => {
      const w = d.data();
      console.log(`  "${w.word}" → topic_id: ${w.topic_id}`);
    });
  }
}

debugTechTopics().catch(console.error).finally(() => process.exit(0));
