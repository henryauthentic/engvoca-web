import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  addDoc,
  deleteDoc,
  updateDoc,
  increment,
  Timestamp,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import { calculateSM2 } from "./sm2";

// ==========================
//  HELPERS: Firestore Timestamp → ISO string
// ==========================

/**
 * Safely convert any date-like value to an ISO string.
 * Handles: Firestore Timestamp, JS Date, epoch number, or plain string.
 */
function toISOStr(val) {
  if (!val) return null;
  // Firestore Timestamp object (has .toDate())
  if (val && typeof val.toDate === 'function') return val.toDate().toISOString();
  // JS Date
  if (val instanceof Date) return val.toISOString();
  // Epoch milliseconds (number)
  if (typeof val === 'number') return new Date(val).toISOString();
  // Already a string
  if (typeof val === 'string') return val;
  return null;
}

/**
 * Normalize a Firestore document: convert ALL known date fields
 * from Timestamp objects to ISO strings so downstream code works.
 */
function normalizeDoc(raw) {
  if (!raw) return raw;
  const doc = { ...raw };
  // camelCase fields (from mobile toFirebaseMap)
  const dateFields = [
    'syncedAt', 'updatedAt', 'firstLearnedDate',
    'nextReviewDate', 'lastReviewDate', 'lastSeenAt',
    // snake_case fields (from web reviewWord / legacy)
    'synced_at', 'updated_at', 'first_learned_date',
    'next_review_date', 'last_review_date', 'last_seen_at',
  ];
  for (const key of dateFields) {
    if (doc[key] !== undefined && doc[key] !== null) {
      doc[key] = toISOStr(doc[key]);
    }
  }
  return doc;
}

// ==========================
//  USER
// ==========================

export async function getUserStats(uid) {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) {
      // Phục vụ trường hợp user mới đăng nhập lần đầu, chưa có document
      return null;
    }
    return { id: snap.id, ...snap.data() };
  } catch (error) {
    console.error("Lỗi khi lấy thông tin user:", error);
    return null;
  }
}

export async function updateUserField(uid, data) {
  await setDoc(doc(db, "users", uid), data, { merge: true });
}

export async function addXP(uid, amount) {
  await setDoc(
    doc(db, "users", uid), 
    { totalXp: increment(amount) }, 
    { merge: true }
  );
}

// ==========================
//  WORD PROGRESS (SM-2)
// ==========================

export async function getWordProgress(uid) {
  const ref = collection(db, "users", uid, "wordProgress");
  const snap = await getDocs(ref);
  return snap.docs.map((d) => normalizeDoc({ id: d.id, ...d.data() }));
}

export async function getSingleWordProgress(uid, wordId) {
  if (!uid || !wordId) return null;
  try {
    const wordRef = doc(db, "users", uid, "wordProgress", wordId);
    const snap = await getDoc(wordRef);
    if (!snap.exists()) return null;
    return normalizeDoc({ id: snap.id, ...snap.data() });
  } catch (e) {
    console.error("Lỗi lấy progress của từ:", e);
    return null;
  }
}

/**
 * ✅ ADVANCED QUERY: Lịch ôn tập dùng Firestore where() query
 * Thay vì tải TOÀN BỘ wordProgress rồi lọc, giờ chỉ query những từ cần ôn.
 * Giảm reads từ ~3000 xuống còn ~20-50.
 */
export async function getWordsToReviewToday(uid) {
  try {
    const ref = collection(db, "users", uid, "wordProgress");
    const now = new Date();
    // Firestore Timestamp for comparison
    const nowTimestamp = Timestamp.fromDate(now);
    
    // Query: status > 0 AND nextReviewDate <= now
    // Note: This requires a composite index (status ASC, nextReviewDate ASC)
    // Firestore will provide a link in the console error to auto-create it
    const q = query(
      ref,
      where("status", "in", [1, 2, 3]),
      where("nextReviewDate", "<=", nowTimestamp)
    );
    
    let results;
    try {
      const snap = await getDocs(q);
      results = snap.docs.map((d) => normalizeDoc({ id: d.id, ...d.data() }));
    } catch (indexError) {
      // Fallback: if composite index doesn't exist yet, try with ISO string comparison
      console.warn("Composite index not ready, trying ISO string fallback...", indexError.message);
      const nowISO = now.toISOString();
      const q2 = query(
        ref,
        where("status", "in", [1, 2, 3]),
        where("nextReviewDate", "<=", nowISO)
      );
      try {
        const snap2 = await getDocs(q2);
        results = snap2.docs.map((d) => normalizeDoc({ id: d.id, ...d.data() }));
      } catch (fallbackError) {
        // Ultimate fallback: load all and filter client-side (old behavior)
        console.warn("Both queries failed, falling back to client-side filter", fallbackError.message);
        const allProgress = await getWordProgress(uid);
        results = allProgress.filter((w) => {
          const status = w.status ?? 0;
          if (status <= 0) return false;
          const reviewDateStr = w.nextReviewDate ?? w.next_review_date;
          if (!reviewDateStr) return false;
          return new Date(reviewDateStr) <= now;
        });
      }
    }
    // ✅ Enrich results with English word, meaning, pronunciation from 'words' collection
    if (results && results.length > 0) {
      const enrichedResults = await Promise.all(results.map(async (p) => {
        if (p.word && p.meaning) return p; // Already has metadata
        const wordDoc = await getWordById(p.id);
        if (wordDoc) {
          return { 
            ...p, 
            word: wordDoc.word, 
            meaning: wordDoc.meaning, 
            pronunciation: wordDoc.pronunciation 
          };
        }
        return p;
      }));
      return enrichedResults;
    }
    
    return results;
  } catch (error) {
    console.error("Lỗi lấy words to review:", error);
    return [];
  }
}

/**
 * Lấy TOÀN BỘ tiến độ học tập và tự động join để lấy chi tiết từ vựng.
 * Phục vụ cho tính năng Xem Lịch sử học tập.
 */
export async function getAllWordProgressWithDetails(uid) {
  try {
    const ref = collection(db, "users", uid, "wordProgress");
    const snap = await getDocs(ref);
    const results = snap.docs.map((d) => normalizeDoc({ id: d.id, ...d.data() }));

    const enrichedResults = await Promise.all(results.map(async (p) => {
      if (p.word && p.meaning) return p;
      const wordDoc = await getWordById(p.id);
      if (wordDoc) {
        return { 
          ...p, 
          word: wordDoc.word, 
          meaning: wordDoc.meaning, 
          pronunciation: wordDoc.pronunciation 
        };
      }
      return p;
    }));
    return enrichedResults;
  } catch (error) {
    console.error("Lỗi lấy all word progress details:", error);
    return [];
  }
}

/**
 * ✅ ADVANCED QUERY: Cập nhật tiến độ học 1 từ + safe topicProgress increment
 * @param {string} uid - User ID
 * @param {string} wordId - Word ID
 * @param {number} quality - SM-2 quality (0-5)
 * @param {string|null} parentTopicId - Parent topic ID for safe progress tracking
 */
export async function reviewWord(uid, wordId, quality, parentTopicId = null) {
  const wordRef = doc(db, "users", uid, "wordProgress", wordId);
  const snap = await getDoc(wordRef);
  
  let currentRep = 0;
  let currentEase = 2.5;
  let currentInt = 1;
  let currentReviewCount = 0;
  let currentLapses = 0;
  let oldStatus = 0;

  if (snap.exists()) {
    const data = snap.data();
    currentRep = data.repetition || 0;
    currentEase = data.easinessFactor ?? data.easiness_factor ?? 2.5;
    currentInt = data.intervalDays ?? data.interval_days ?? 1;
    currentReviewCount = data.reviewCount ?? data.review_count ?? 0;
    currentLapses = data.lapses || 0;
    oldStatus = data.status || 0;
  }

  if (quality < 3) {
    currentLapses += 1;
  }

  // Tính toán chỉ số SM-2 mới (returns camelCase)
  const newStats = calculateSM2(quality, currentRep, currentEase, currentInt);

  // Logic chuyển đổi Status CHUẨN như srs_service.dart của Mobile App
  let newStatus = oldStatus;
  if (newStatus === 0) {
    newStatus = 1; // From New to Learning
  } else if (newStatus === 1 && quality >= 4) {
    newStatus = 2; // From Learning to Reviewing
  }
  
  if (newStats.intervalDays > 21) {
    newStatus = 3; // Mastered
  } else if (newStats.intervalDays <= 21 && newStatus === 3) {
    newStatus = 2; // Demoted back to Reviewing if forgotten
  }

  // Chuyển đổi ngày tháng từ SM2 (chuỗi ISO) sang Timestamp của Firestore
  const nextReviewDateObj = newStats.nextReviewDate ? new Date(newStats.nextReviewDate) : new Date();
  const lastReviewDateObj = newStats.lastReviewDate ? new Date(newStats.lastReviewDate) : new Date();

  const writeData = {
    ...newStats,
    nextReviewDate: Timestamp.fromDate(nextReviewDateObj),
    lastReviewDate: Timestamp.fromDate(lastReviewDateObj),
    wordId: wordId,
    quality: quality,
    reviewCount: currentReviewCount + 1,
    lapses: currentLapses,
    status: newStatus,
    updatedAt: serverTimestamp(),
    syncedAt: serverTimestamp(),
  };

  // Thêm firstLearnedDate khi lần đầu học (match mobile)
  let isNewWord = false;
  if (!snap.exists()) {
    writeData.firstLearnedDate = serverTimestamp();
    isNewWord = true;
  } else {
    // Nếu chưa từng có firstLearnedDate và status chuyển sang > 0
    if (!snap.data().firstLearnedDate && !snap.data().first_learned_date && newStatus > 0) {
      writeData.firstLearnedDate = serverTimestamp();
      isNewWord = true;
    }
  }

  await setDoc(wordRef, writeData, { merge: true });

  // ✅ ADVANCED QUERY: Safe topicProgress increment + sync metadata
  const userRef = doc(db, "users", uid);
  
  // Format today string (YYYY-MM-DD) in local time
  const todayDate = new Date();
  const y = todayDate.getFullYear();
  const m = String(todayDate.getMonth() + 1).padStart(2, '0');
  const d = String(todayDate.getDate()).padStart(2, '0');
  const todayStr = `${y}-${m}-${d}`;
  
  const userUpdate = {
    lastSyncedAt: serverTimestamp(),
    lastChangeSource: 'web',
    lastStudyDate: todayStr,
    [`dailyStats.${todayStr}.reviewed`]: increment(1),
    [`dailyWordCounts.${todayStr}`]: increment(1),
  };
  
  if (isNewWord) {
    userUpdate[`dailyStats.${todayStr}.learned`] = increment(1);
  }

  // ✅ Safe increment: only when status crosses the threshold
  if (parentTopicId) {
    if (oldStatus < 2 && newStatus >= 2) {
      // Word just became "learned" → increment topic progress
      userUpdate[`topicProgress.${parentTopicId}`] = increment(1);
    } else if (oldStatus >= 2 && newStatus < 2) {
      // Word was forgotten → decrement topic progress
      userUpdate[`topicProgress.${parentTopicId}`] = increment(-1);
    }
  }

  // Update totalReviews always, totalLapses only when quality < 3
  userUpdate.totalReviews = increment(1);
  if (quality < 3) {
    userUpdate.totalLapses = increment(1);
  }

  // Tăng learnedWords học được (nếu đây là lần đầu được học)
  if (!snap.exists() && quality >= 3) {
    userUpdate.learnedWords = increment(1);
  } else if (snap.exists() && quality >= 3) {
    // Nếu trước đó chưa "thuộc" (quality cũ < 3) mà giờ thuộc => cũng cộng
    const oldQuality = snap.data().quality || 0;
    if (oldQuality < 3) {
      userUpdate.learnedWords = increment(1);
    }
  }

  // Use updateDoc instead of setDoc to properly parse dot-notation fields
  await updateDoc(userRef, userUpdate).catch(async (e) => {
    // If document doesn't exist, set it first
    if (e.code === 'not-found') {
      const initData = {
        dailyStats: {
          [todayStr]: { reviewed: 0, learned: 0 }
        },
        dailyWordCounts: {},
        topicProgress: {},
        totalReviews: 0,
        totalLapses: 0,
        learnedWords: 0
      };
      await setDoc(userRef, initData);
      await updateDoc(userRef, userUpdate);
    } else {
      throw e;
    }
  });

  return newStats;
}

// ==========================
//  SAVED WORDS & DIFFICULT WORDS
// ==========================

export async function toggleDifficultWord(uid, wordId, wordMeta = null) {
  const wordRef = doc(db, "users", uid, "wordProgress", wordId);
  const snap = await getDoc(wordRef);
  const now = new Date().toISOString();
  
  // Build optional metadata fields (word, meaning, pronunciation)
  const metaFields = {};
  if (wordMeta) {
    if (wordMeta.word) metaFields.word = wordMeta.word;
    if (wordMeta.meaning) metaFields.meaning = wordMeta.meaning;
    if (wordMeta.meanings) metaFields.meanings = wordMeta.meanings;
    if (wordMeta.pronunciation) metaFields.pronunciation = wordMeta.pronunciation;
  }
  
  if (!snap.exists()) {
    // Nếu chưa có progress, tạo mới và đánh dấu khó (camelCase match mobile)
    await setDoc(wordRef, {
      wordId: wordId,
      status: 0,
      repetition: 0,
      easinessFactor: 2.5,
      intervalDays: 0,
      reviewCount: 0,
      lapses: 0,
      wrongCount: 0,
      isDifficult: true,
      updatedAt: serverTimestamp(),
      syncedAt: serverTimestamp(),
      ...metaFields,
    });
    // ✅ Stamp sync metadata
    await setDoc(doc(db, "users", uid), {
      lastSyncedAt: serverTimestamp(),
      lastChangeSource: 'web',
    }, { merge: true });
    return true;
  } else {
    // Đảo trạng thái
    const data = snap.data();
    const isCurrentlyDifficult = data.isDifficult === true || data.is_difficult === 1 || data.is_difficult === true;
    const newState = !isCurrentlyDifficult;
    await setDoc(wordRef, {
      isDifficult: newState,
      updatedAt: serverTimestamp(),
      syncedAt: serverTimestamp(),
      ...metaFields,
    }, { merge: true });
    // ✅ Stamp sync metadata
    await setDoc(doc(db, "users", uid), {
      lastSyncedAt: serverTimestamp(),
      lastChangeSource: 'web',
    }, { merge: true });
    return newState;
  }
}

export async function getSavedWords(uid) {
  try {
    const ref = collection(db, "users", uid, "savedWords");
    const snap = await getDocs(ref);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch(e) {
    return [];
  }
}

export async function saveWord(uid, wordData) {
  const safeId = wordData.word.toLowerCase().replace(/[^a-z0-9]/g, '');
  const ref = doc(db, "users", uid, "savedWords", safeId);
  await setDoc(ref, {
    ...wordData,
    savedAt: new Date().toISOString(),
  });
  return safeId;
}

export async function removeSavedWord(uid, wordId) {
  await deleteDoc(doc(db, "users", uid, "savedWords", wordId));
}

// ==========================
//  QUIZ/PRACTICE RESULTS
// ==========================

export async function getPracticeHistory(uid) {
  try {
    const ref = collection(db, "users", uid, "practiceHistory");
    const snap = await getDocs(query(ref, orderBy("timestamp", "desc"), limit(10)));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch(e){
    return [];
  }
}

export async function savePracticeResult(uid, score, totalQuestions, gainedXp) {
  // Đổi từ practiceHistory sang quizResults để đồng bộ với Mobile
  const ref = collection(db, "users", uid, "quizResults");
  await addDoc(ref, {
    score,
    totalQuestions,
    gainedXp,
    timestamp: new Date().toISOString(),
  });
  
  // Cộng XP vào profile
  await addXP(uid, gainedXp);
}

// ==========================
//  STUDY TIME HISTORY
// ==========================
export async function getStudyTimeHistory(uid, days = 30) {
  try {
    const ref = collection(db, "users", uid, "studyTimeHistory");
    const snap = await getDocs(ref);
    const allDocs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    
    if (allDocs.length > 0) {
      allDocs.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      return allDocs.slice(0, days);
    }
    
    // Fallback: compute from wordProgress timestamps
    // Each word interaction ~ 30 seconds of study
    console.log("[StudyTime] studyTimeHistory empty, computing from wordProgress...");
    const progressRef = collection(db, "users", uid, "wordProgress");
    const progressSnap = await getDocs(progressRef);
    const progressDocs = progressSnap.docs.map(d => d.data());
    
    const dayMap = {};
    for (const p of progressDocs) {
      // Use updatedAt (most recent interaction timestamp)
      let dateVal = p.updatedAt || p.updated_at || p.lastReviewDate || p.last_review_date || p.firstLearnedDate || p.first_learned_date;
      if (!dateVal) continue;
      
      let dateObj;
      if (dateVal && typeof dateVal.toDate === 'function') {
        dateObj = dateVal.toDate();
      } else if (typeof dateVal === 'number') {
        dateObj = new Date(dateVal);
      } else if (typeof dateVal === 'string') {
        dateObj = new Date(dateVal);
      }
      if (!dateObj || isNaN(dateObj.getTime())) continue;
      
      // Convert to local YYYY-MM-DD
      const tzOffset = dateObj.getTimezoneOffset() * 60000;
      const localDate = new Date(dateObj.getTime() - tzOffset);
      const dateStr = localDate.toISOString().split('T')[0];
      
      if (!dayMap[dateStr]) dayMap[dateStr] = 0;
      dayMap[dateStr] += 30; // ~30 seconds per word interaction
    }
    
    const result = Object.entries(dayMap).map(([date, seconds]) => ({
      date,
      study_time_seconds: seconds,
      studyTimeSeconds: seconds,
    }));
    
    result.sort((a, b) => b.date.localeCompare(a.date));
    console.log("[StudyTime] Computed from wordProgress:", result.slice(0, 7));
    return result.slice(0, days);
  } catch (e) {
    console.error("Lỗi lấy study time:", e);
    return [];
  }
}

// ==========================
//  BADGES
// ==========================
export async function getUserBadges(uid) {
  try {
    const ref = collection(db, "users", uid, "badges");
    const snap = await getDocs(ref);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.error("Lỗi lấy badges:", e);
    return [];
  }
}

// ==========================
//  LEADERBOARD (Real users)
// ==========================
export async function getLeaderboard(maxResults = 10) {
  try {
    const ref = collection(db, "users");
    const q = query(ref, orderBy("totalXp", "desc"), limit(maxResults));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.error("Lỗi lấy leaderboard:", e);
    return [];
  }
}

// ==========================
//  STUDY SESSIONS (for heatmap)
// ==========================
export async function getStudySessions(uid, days = 180) {
  try {
    // Fetch ALL, sort client-side to avoid Firestore index requirement
    const ref = collection(db, "users", uid, "studyTimeHistory");
    const snap = await getDocs(ref);
    const allDocs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    
    allDocs.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    return allDocs.slice(0, days);
  } catch (e) {
    console.error("Lỗi lấy study sessions:", e);
    return [];
  }
}

// ==========================
//  TOPICS (Root collection)
// ==========================

/**
 * Lấy toàn bộ danh sách chủ đề từ collection gốc `topics`
 * Schema: { id, name, description, color_hex, icon_url, total_words, order_index, is_unlocked, learned_words }
 */
export async function getTopics() {
  try {
    const ref = collection(db, "topics");
    const q = query(ref, orderBy("order_index", "asc"));
    const snap = await getDocs(q);
    return snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(t => !t.deleted);
  } catch (e) {
    console.error("Lỗi lấy topics:", e);
    return [];
  }
}

// ==========================
//  WORDS (Root collection)
// ==========================

/**
 * Lấy danh sách từ vựng theo topic_id từ collection gốc `words`
 * Schema: { id, word, meaning, pronunciation, example, topic_id, is_learned, is_favorite, difficulty_level, image_url, audio_url }
 */
export async function getWordsByTopic(topicId) {
  try {
    const ref = collection(db, "words");
    const q = query(ref, where("topic_id", "==", topicId));
    const snap = await getDocs(q);
    return snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(w => !w.deleted);
  } catch (e) {
    console.error("Lỗi lấy words:", e);
    return [];
  }
}

/**
 * Lấy một từ vựng theo ID
 */
export async function getWordById(wordId) {
  try {
    const ref = doc(db, "words", wordId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() };
    }
    return null;
  } catch (e) {
    console.error("Lỗi lấy word by id:", e);
    return null;
  }
}

/**
 * Lấy toàn bộ từ vựng
 */
export async function getAllWords() {
  try {
    const ref = collection(db, "words");
    const snap = await getDocs(ref);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.error("Lỗi lấy tất cả từ vựng:", e);
    return [];
  }
}

/**
 * Lấy danh sách từ vựng theo mảng ID
 */
export async function getWordsByIds(wordIds) {
  if (!wordIds || wordIds.length === 0) return [];
  try {
    // Firestore in query has a limit of 10. If more, we need to batch.
    const chunks = [];
    for (let i = 0; i < wordIds.length; i += 10) {
      chunks.push(wordIds.slice(i, i + 10));
    }
    
    const results = [];
    for (const chunk of chunks) {
      const ref = collection(db, "words");
      const q = query(ref, where("__name__", "in", chunk));
      const snap = await getDocs(q);
      results.push(...snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }
    return results;
  } catch (e) {
    console.error("Lỗi lấy words by ids:", e);
    return [];
  }
}

/**
 * ✅ ADVANCED QUERY: Tính % tiến trình học từ User Doc (0 extra Reads)
 * Đọc field topicProgress đã được denormalize sẵn trong users/{uid}
 * thay vì tải toàn bộ getAllWords() + getWordProgress()
 */
export async function getTopicsWithProgress(uid) {
  try {
    const [topics, userStats] = await Promise.all([
      getTopics(),
      getUserStats(uid),
    ]);

    // Lọc lấy Parent Topics (không có parent_id)
    const parentTopics = topics.filter(t => !t.parent_id);

    // Lấy topicProgress từ User Doc (đã được Mobile/Web push lên)
    const topicProgress = userStats?.topicProgress || {};

    return parentTopics.map(topic => {
      const total = topic.total_words || 0;
      const learnedInTopic = topicProgress[topic.id] || 0;
      // Safe formula: clamp to [0, 100], handle NaN
      const progress = total > 0 ? Math.min(Math.round((learnedInTopic / total) * 100), 100) : 0;
      return { ...topic, progress, learnedInTopic };
    });
  } catch (e) {
    console.error("Lỗi tính progress topics:", e);
    return [];
  }
}

// ==========================
//  STREAK VALIDATION & UPDATE
// ==========================

/**
 * Helper: strip time from Date, return midnight Date.
 */
function stripTime(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Helper: get local YYYY-MM-DD string.
 */
function getLocalYMD(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Validate streak on dashboard load (login check).
 * If user missed too many days → reset streak on Firestore.
 * Does NOT increment streak — only breaks or applies grace.
 * @returns {Object|null} Updated streak data
 */
export async function validateAndUpdateStreak(uid) {
  try {
    const userSnap = await getDoc(doc(db, "users", uid));
    if (!userSnap.exists()) return null;

    const data = userSnap.data();
    let currentStreak = data.currentStreak || 0;
    let longestStreak = data.longestStreak || 0;
    let usedGracePeriod = data.usedGracePeriod || false;
    const lastStudyDate = data.lastStudyDate || null;

    // No study date → streak must be 0
    if (!lastStudyDate) {
      if (currentStreak > 0) {
        await updateDoc(doc(db, "users", uid), {
          currentStreak: 0,
          usedGracePeriod: false,
        });
      }
      return { currentStreak: 0, longestStreak, usedGracePeriod: false, lastStudyDate };
    }

    // Calculate day difference
    const now = stripTime(new Date());
    const last = stripTime(new Date(lastStudyDate));
    const diffDays = Math.round((now - last) / 86400000);

    let needsUpdate = false;

    if (diffDays <= 1) {
      // Today or yesterday → streak is active, do nothing
    } else if (diffDays === 2 && !usedGracePeriod && currentStreak > 0) {
      // Grace period: missed 1 day
      usedGracePeriod = true;
      needsUpdate = true;
      console.log('😴 Streak grace period used. Streak kept:', currentStreak);
    } else {
      // Missed too many days → break streak
      currentStreak = 0;
      usedGracePeriod = false;
      needsUpdate = true;
      console.log('💀 Streak broken. Missed', diffDays - 1, 'days');
    }

    if (needsUpdate) {
      await updateDoc(doc(db, "users", uid), {
        currentStreak,
        usedGracePeriod,
      });
    }

    return { currentStreak, longestStreak, usedGracePeriod, lastStudyDate };
  } catch (e) {
    console.error('❌ Error validating streak:', e);
    return null;
  }
}

/**
 * Update streak after a study session.
 * Called ONCE per session (not per word).
 * Reads current streak → recalculates → writes back.
 */
export async function updateStreakAfterStudy(uid) {
  try {
    const userSnap = await getDoc(doc(db, "users", uid));
    if (!userSnap.exists()) return;

    const data = userSnap.data();
    const todayStr = getLocalYMD(new Date());
    const oldLastStudy = data.lastStudyDate || null;
    let streak = data.currentStreak || 0;
    let longest = data.longestStreak || 0;
    let grace = data.usedGracePeriod || false;

    if (!oldLastStudy || oldLastStudy === todayStr) {
      // First study ever OR already studied today
      if (streak === 0) streak = 1;
    } else {
      const now = stripTime(new Date());
      const last = stripTime(new Date(oldLastStudy));
      const diff = Math.round((now - last) / 86400000);

      if (diff === 1) {
        // Consecutive day → increment
        streak++;
        grace = false;
      } else if (diff === 2 && !grace) {
        // Grace period → increment but mark grace used
        streak++;
        grace = true;
      } else {
        // Too many days missed → new streak
        streak = 1;
        grace = false;
      }
    }

    if (streak > longest) longest = streak;

    await updateDoc(doc(db, "users", uid), {
      currentStreak: streak,
      longestStreak: longest,
      usedGracePeriod: grace,
      lastStudyDate: todayStr,
    });

    console.log('🔥 Streak updated:', streak, '(longest:', longest, ')');
  } catch (e) {
    console.error('❌ Error updating streak after study:', e);
  }
}
