const admin = require("firebase-admin");
const sa = require("./serviceAccountKey.json");
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function compareUsers() {
  // Find both users
  const usersSnap = await db.collection("users").get();
  
  for (const userDoc of usersSnap.docs) {
    const data = userDoc.data();
    const name = data.displayName || data.name || "unknown";
    
    if (!name.includes("Chun") && !name.includes("Chung")) continue;
    
    console.log(`\n${"=".repeat(60)}`);
    console.log(`User: ${name} (${userDoc.id})`);
    console.log(`Email: ${data.email}`);
    console.log(`learnedWords: ${data.learnedWords}`);
    console.log(`totalXp: ${data.totalXp}`);
    console.log(`totalReviews: ${data.totalReviews}`);
    console.log(`totalLapses: ${data.totalLapses}`);
    console.log(`lastChangeSource: ${data.lastChangeSource}`);
    
    // Check topicProgress
    const tp = data.topicProgress;
    if (!tp || Object.keys(tp).length === 0) {
      console.log(`topicProgress: ❌ EMPTY or MISSING`);
    } else {
      console.log(`topicProgress: ✅ ${Object.keys(tp).length} topics`);
      for (const [topicId, count] of Object.entries(tp)) {
        // Get topic name
        const topicDoc = await db.collection("topics").doc(topicId).get();
        const topicName = topicDoc.exists ? topicDoc.data().name : "unknown";
        console.log(`  ${topicName}: ${count} words learned`);
      }
    }
    
    // Check wordProgress subcollection count
    const wpSnap = await db.collection("users").doc(userDoc.id)
      .collection("wordProgress").get();
    console.log(`wordProgress docs: ${wpSnap.size}`);
    
    // Count by status
    const statusCounts = {};
    wpSnap.docs.forEach(d => {
      const s = d.data().status || 0;
      statusCounts[s] = (statusCounts[s] || 0) + 1;
    });
    console.log(`Status distribution:`, statusCounts);
    
    // Check retention (quality distribution)
    let totalQuality = 0;
    let qualityCount = 0;
    wpSnap.docs.forEach(d => {
      const q = d.data().quality;
      if (q !== undefined && q !== null) {
        totalQuality += q;
        qualityCount++;
      }
    });
    if (qualityCount > 0) {
      console.log(`Avg quality: ${(totalQuality / qualityCount).toFixed(2)} (${qualityCount} reviews)`);
    }
  }
}

compareUsers().catch(console.error).finally(() => process.exit(0));
