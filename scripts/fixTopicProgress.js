const admin = require("firebase-admin");
const sa = require("./serviceAccountKey.json");
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const TARGET_UID = "wdoVimRJk9MEdeKXeBnJwaRHk8w2"; // Híu Chun

async function fixTopicProgress() {
  // 1. Get all wordProgress for this user
  const wpSnap = await db.collection("users").doc(TARGET_UID)
    .collection("wordProgress").get();
  
  console.log(`wordProgress docs: ${wpSnap.size}`);
  
  // 2. Get all words to map wordId → topic_id → parent topic
  const wordsSnap = await db.collection("words").get();
  const wordToTopic = {};
  wordsSnap.docs.forEach(d => {
    wordToTopic[d.id] = d.data().topic_id;
  });
  
  // 3. Get all topics to find parent
  const topicsSnap = await db.collection("topics").get();
  const topicToParent = {};
  topicsSnap.docs.forEach(d => {
    const data = d.data();
    topicToParent[d.id] = data.parent_id || d.id; // if no parent, it IS the parent
  });
  
  // 4. Compute topicProgress (status >= 2 = learned, group by PARENT topic)
  const topicProgress = {};
  let totalReviews = 0;
  let totalLapses = 0;
  
  wpSnap.docs.forEach(d => {
    const data = d.data();
    const wordId = d.id;
    const status = data.status || 0;
    const reviewCount = data.reviewCount ?? data.review_count ?? 0;
    const lapses = data.lapses || 0;
    
    totalReviews += reviewCount;
    totalLapses += lapses;
    
    if (status >= 2) {
      const topicId = wordToTopic[wordId];
      if (topicId) {
        const parentId = topicToParent[topicId] || topicId;
        topicProgress[parentId] = (topicProgress[parentId] || 0) + 1;
      }
    }
  });
  
  // 5. Show result
  console.log(`\ntopicProgress computed:`);
  for (const [topicId, count] of Object.entries(topicProgress)) {
    const topicDoc = await db.collection("topics").doc(topicId).get();
    const name = topicDoc.exists ? topicDoc.data().name : "unknown";
    console.log(`  ${name}: ${count} words`);
  }
  console.log(`\ntotalReviews: ${totalReviews}`);
  console.log(`totalLapses: ${totalLapses}`);
  
  // 6. Update user doc
  await db.collection("users").doc(TARGET_UID).set({
    topicProgress: topicProgress,
    totalReviews: totalReviews,
    totalLapses: totalLapses,
  }, { merge: true });
  
  console.log(`\n✅ Updated Híu Chun's user doc with correct topicProgress`);
}

fixTopicProgress().catch(console.error).finally(() => process.exit(0));
