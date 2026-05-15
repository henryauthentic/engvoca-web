const admin = require("firebase-admin");
const sa = require("./serviceAccountKey.json");
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function groupOrphanWords() {
  // Get all words with empty topic_id
  const snap = await db.collection("words")
    .where("topic_id", "==", "")
    .get();

  console.log(`Total orphan words (topic_id = ""): ${snap.size}\n`);

  // Group by created_at timestamp
  const groups = {};
  snap.docs.forEach(d => {
    const data = d.data();
    const ts = data.created_at || "unknown";
    if (!groups[ts]) groups[ts] = [];
    groups[ts].push({ id: d.id, word: data.word, meaning: data.meaning });
  });

  // Show each group with sample words
  const sortedKeys = Object.keys(groups).sort();
  sortedKeys.forEach((ts, idx) => {
    const words = groups[ts];
    const samples = words.slice(0, 5).map(w => `${w.word} (${w.meaning})`).join(", ");
    console.log(`Batch ${idx + 1}: ${ts} — ${words.length} từ`);
    console.log(`  Samples: ${samples}`);
    console.log();
  });

  // Also show TECHNOLOGY sub-topics for reference
  console.log("\n=== TECHNOLOGY sub-topics ===");
  const topicsSnap = await db.collection("topics").get();
  const allTopics = topicsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const techParent = allTopics.find(t => t.name === "TECHNOLOGY" && !t.parent_id);
  const techChildren = allTopics.filter(t => t.parent_id === techParent?.id && !t.deleted);
  techChildren.forEach((c, i) => {
    console.log(`  ${i + 1}. ${c.name} → ${c.id}`);
  });
}

groupOrphanWords().catch(console.error).finally(() => process.exit(0));
