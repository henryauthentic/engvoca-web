const admin = require("firebase-admin");
const sa = require("./serviceAccountKey.json");
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

// Mapping: timestamp range → topic_id (based on word content analysis)
const TOPIC_MAP = {
  // IoT: sensor, smart home, firmware, gateway, connected device, real-time, protocol...
  "4WX9SKdeZLj26xD6e1fX": ["2026-05-12T01:28:32"],
  // Social Media: influencer, engagement, hashtag, follower, viral, reel, sponsored...
  "IV39zvc92KRKpqvPvVIe": ["2026-05-12T01:29:27"],
  // Digital Entertainment: pixel, playlist, subscription, metaverse, indie game...
  "IkmgfBHocR7HYP1J0shE": ["2026-05-12T01:30:09"],
  // Data Science: dimensionality reduction, mean, pipeline, ETL, data warehouse...
  "Ph2C05dG9xi6sa6HKLLT": ["2026-05-12T01:30:36"],
  // Mobile Technology: Wi-Fi, 5G, touchscreen, SIM card, biometric...
  "aIouMUHRSTYDvchDAmcf": ["2026-05-12T01:32:05"],
  // Software Development: debugging, version control, branch, stack, runtime...
  "aGZdoCPVPa1ss8xF3mBh": ["2026-05-12T01:32:51"],
  // Cloud Computing: hybrid cloud, SaaS, virtual machine, kubernetes...
  "hu1mNOnX0crlQiNqsbr7": ["2026-05-12T01:33:23"],
  // E-commerce: dropshipping, buyer, bundle, flash sale...
  "pfwpNBw7dHu9inwxGrwR": ["2026-05-12T01:34:02"],
  // Artificial Intelligence: embedding, generative AI, benchmark, fine-tuning...
  "pgYscy6g2l6xkgjvj3Gi": ["2026-05-12T01:34:35"],
  // Cybersecurity: cryptography, antivirus, audit, honeypot, sandbox...
  "tIliNy49UdneKNqCLjRd": ["2026-05-12T01:35:30"],
};

async function fixOrphanWords() {
  const snap = await db.collection("words")
    .where("topic_id", "==", "")
    .get();

  console.log(`Found ${snap.size} orphan words to fix.\n`);

  let fixedCount = 0;
  let unfixedCount = 0;
  const topicCounts = {};
  const batch500 = [];

  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    const ts = data.created_at || "";

    // Find matching topic
    let matchedTopicId = null;
    for (const [topicId, prefixes] of Object.entries(TOPIC_MAP)) {
      if (prefixes.some(p => ts.startsWith(p))) {
        matchedTopicId = topicId;
        break;
      }
    }

    if (matchedTopicId) {
      batch500.push({ ref: docSnap.ref, topicId: matchedTopicId });
      topicCounts[matchedTopicId] = (topicCounts[matchedTopicId] || 0) + 1;
      fixedCount++;
    } else {
      console.log(`  ⚠️ No match for: "${data.word}" (ts=${ts})`);
      unfixedCount++;
    }
  }

  // Execute in batches of 500
  for (let i = 0; i < batch500.length; i += 400) {
    const chunk = batch500.slice(i, i + 400);
    const batch = db.batch();
    chunk.forEach(({ ref, topicId }) => {
      batch.update(ref, { topic_id: topicId });
    });
    await batch.commit();
    console.log(`Committed batch ${Math.floor(i / 400) + 1}: ${chunk.length} words`);
  }

  // Update topic word counts
  console.log("\nUpdating topic word counts:");
  for (const [topicId, count] of Object.entries(topicCounts)) {
    await db.collection("topics").doc(topicId).update({
      total_words: admin.firestore.FieldValue.increment(count),
    });
    console.log(`  ${topicId}: +${count} words`);
  }

  // Also update parent TECHNOLOGY topic
  const totalFixed = Object.values(topicCounts).reduce((a, b) => a + b, 0);
  await db.collection("topics").doc("hqVDAaWqNgeEn5SxJGrb").update({
    total_words: admin.firestore.FieldValue.increment(totalFixed),
  });
  console.log(`  TECHNOLOGY parent: +${totalFixed} words`);

  console.log(`\n✅ Fixed: ${fixedCount}, ⚠️ Unfixed: ${unfixedCount}`);
}

fixOrphanWords().catch(console.error).finally(() => process.exit(0));
