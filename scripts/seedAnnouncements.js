const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function seedAnnouncements() {
  console.log("Clearing old announcements...");
  const snapshot = await db.collection("announcements").get();
  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();
  console.log("Deleted old announcements.");

  console.log("Adding new test announcements...");
  
  const today = new Date();
  const nextWeek = new Date();
  nextWeek.setDate(today.getDate() + 7);

  const announcements = [
    {
      title: "🔥 Luyện từ vựng ngay!",
      subtitle: "Bộ từ vựng IELTS đang chờ bạn",
      message: "Hàng trăm từ vựng chủ đề giáo dục vừa được cập nhật. Hãy vào học ngay để nâng cao trình độ!",
      type: "streak",
      template: "streak",
      displayMode: "banner",
      isActive: true,
      badge: "HOT",
      ctaText: "Học từ vựng",
      ctaStyle: "primary",
      deepLink: "tab:vocabulary",
      targetScreens: ["home", "vocabulary"], // Hiện ở Home và Vocabulary
      isDismissible: true,
      showOnlyOnce: false,
      cooldownHours: 24,
      targetMinLevel: 0,
      targetPlatform: "all",
      priority: 10,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: "admin",
      startDate: today.toISOString().split("T")[0],
      endDate: nextWeek.toISOString().split("T")[0]
    },
    {
      title: "🎁 Quà tặng bất ngờ!",
      subtitle: "Phần thưởng đặc biệt",
      message: "Bạn đã được tặng 500 XP. Hãy kiểm tra tiến độ của bạn ngay nhé!",
      type: "reward",
      template: "reward",
      displayMode: "popup",
      isActive: true,
      badge: "NEW",
      ctaText: "Xem tiến độ",
      ctaStyle: "primary",
      deepLink: "tab:progress",
      isDismissible: true,
      showOnlyOnce: true, // Popup chỉ hiện 1 lần
      cooldownHours: 0,
      targetMinLevel: 0,
      targetPlatform: "all",
      priority: 20,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: "admin",
      startDate: today.toISOString().split("T")[0],
      endDate: nextWeek.toISOString().split("T")[0]
    },
    {
      title: "💡 Mẹo học nhanh",
      subtitle: "Tính năng Tra Từ Điển",
      message: "Bạn có biết app đã tích hợp sẵn từ điển đa ngôn ngữ chưa? Hãy thử tra một từ ngay bây giờ!",
      type: "info",
      template: "info",
      displayMode: "bottom_sheet",
      isActive: true,
      ctaText: "Tra từ ngay",
      ctaStyle: "secondary",
      deepLink: "tab:dictionary",
      isDismissible: true,
      showOnlyOnce: true, // Sheet chỉ hiện 1 lần
      cooldownHours: 0,
      targetMinLevel: 0,
      targetPlatform: "all",
      priority: 15,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: "admin",
      startDate: today.toISOString().split("T")[0],
      endDate: nextWeek.toISOString().split("T")[0]
    },
    {
      title: "🚀 Tham gia Cộng đồng",
      subtitle: "Cùng nhau học tốt hơn",
      message: "Hãy ghé thăm trang Facebook của chúng tôi để cập nhật các sự kiện mới nhất và học hỏi từ các cao thủ!",
      type: "event",
      template: "event",
      displayMode: "banner",
      isActive: true,
      badge: "EVENT",
      ctaText: "Tham gia",
      ctaStyle: "primary",
      deepLink: "https://facebook.com",
      targetScreens: ["home"],
      isDismissible: true,
      showOnlyOnce: false,
      cooldownHours: 12,
      targetMinLevel: 0,
      targetPlatform: "all",
      priority: 5,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: "admin",
      startDate: today.toISOString().split("T")[0],
      endDate: nextWeek.toISOString().split("T")[0]
    }
  ];

  for (const ann of announcements) {
    await db.collection("announcements").add(ann);
  }

  console.log("Successfully seeded 3 new announcements!");
  process.exit(0);
}

seedAnnouncements().catch(console.error);
