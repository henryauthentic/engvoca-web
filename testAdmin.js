const admin = require("firebase-admin");
const serviceAccount = require("./scripts/serviceAccountKey.json");
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();
async function test() {
  const doc = await db.doc("users/o9N7KROmJKg4ZI7EYiRoPE1mK8w1").get();
  console.log("User data:", doc.data());
}
test();
