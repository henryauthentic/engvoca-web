/**
 * ═══════════════════════════════════════════════════════════
 * ADMIN SERVICE — All admin queries, writes, and audit logging
 * ═══════════════════════════════════════════════════════════
 *
 * Phase 1: Firebase Client SDK + Firestore Security Rules
 * All writes protected by rules checking role == "admin"
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getCountFromServer,
  serverTimestamp,
  increment,
  arrayUnion,
  writeBatch,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";

// ════════════════════════════════════════════
//  AUDIT LOG
// ════════════════════════════════════════════

/**
 * Write an immutable audit log entry
 */
export async function writeAuditLog(adminUid, action, targetId, details = {}) {
  try {
    await addDoc(collection(db, "adminLogs"), {
      adminUid,
      action,
      targetId: targetId || null,
      details,
      timestamp: serverTimestamp(),
    });
  } catch (err) {
    console.error("Failed to write audit log:", err);
    // Don't throw — audit log failure shouldn't block admin actions
  }
}

/**
 * Helper: Record a pending change for the Release Pipeline
 */
async function _recordPendingChange(type, count, summaryText) {
  const ref = doc(db, "system", "pendingRelease");
  
  // Initialize document structure using FieldValue.increment
  const updates = {
    updatedAt: serverTimestamp()
  };
  
  if (type === "topicsVersion") {
    updates.pendingTopicsCount = increment(count);
  } else if (type === "wordsVersion") {
    updates.pendingWordsCount = increment(count);
  }
  
  if (summaryText) {
    const timeString = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    updates.changesSummary = arrayUnion(`[${timeString}] ${summaryText}`);
  }
  
  await setDoc(ref, updates, { merge: true });
}

/**
 * Commit a version bump (Publish)
 */
export async function commitVersionBump(adminUid) {
  const sysRef = doc(db, "system", "contentVersion");
  const pendingRef = doc(db, "system", "pendingRelease");

  // 1. Get current versions and pending data
  const [sysDoc, pendingDoc] = await Promise.all([
    getDoc(sysRef),
    getDoc(pendingRef)
  ]);

  const pendingData = pendingDoc.exists() ? pendingDoc.data() : null;
  if (!pendingData || (pendingData.pendingTopicsCount === 0 && pendingData.pendingWordsCount === 0)) {
    return; // Nothing to publish
  }

  const currentTopicsVer = sysDoc.exists() ? (sysDoc.data().topicsVersion || 1) : 1;
  const currentWordsVer = sysDoc.exists() ? (sysDoc.data().wordsVersion || 1) : 1;
  const newTopicsVer = pendingData.pendingTopicsCount > 0 ? currentTopicsVer + 1 : currentTopicsVer;
  const newWordsVer = pendingData.pendingWordsCount > 0 ? currentWordsVer + 1 : currentWordsVer;

  // 2. Batch update draft documents
  // Note: Due to 500 limit, we might need pagination if there are many docs.
  // For simplicity here, assuming < 500 edits per publish (since Firestore has limits).
  // If > 500, we should paginate. We will handle pagination for robust scale.
  const batchArray = [];
  let batch = writeBatch(db);
  let operationCounter = 0;

  const commitBatchIfNeeded = () => {
    if (operationCounter === 500) {
      batchArray.push(batch.commit());
      batch = writeBatch(db);
      operationCounter = 0;
    }
  };

  if (pendingData.pendingTopicsCount > 0) {
    const draftTopics = await getDocs(query(collection(db, "topics"), where("contentVersion", "==", 0)));
    draftTopics.docs.forEach(docSnap => {
      batch.update(docSnap.ref, { contentVersion: newTopicsVer });
      operationCounter++;
      commitBatchIfNeeded();
    });
  }

  if (pendingData.pendingWordsCount > 0) {
    const draftWords = await getDocs(query(collection(db, "words"), where("contentVersion", "==", 0)));
    draftWords.docs.forEach(docSnap => {
      batch.update(docSnap.ref, { contentVersion: newWordsVer });
      operationCounter++;
      commitBatchIfNeeded();
    });
  }

  if (operationCounter > 0) {
    batchArray.push(batch.commit());
  }

  await Promise.all(batchArray);

  // 3. Update system/contentVersion
  const sysUpdates = {};
  if (pendingData.pendingTopicsCount > 0) {
    sysUpdates.topicsVersion = newTopicsVer;
    sysUpdates.lastTopicsBumpAt = serverTimestamp();
  }
  if (pendingData.pendingWordsCount > 0) {
    sysUpdates.wordsVersion = newWordsVer;
    sysUpdates.lastWordsBumpAt = serverTimestamp();
  }
  sysUpdates.lastUpdatedAt = serverTimestamp();
  await setDoc(sysRef, sysUpdates, { merge: true });

  // 4. Save Release Note
  const maxVersion = Math.max(newTopicsVer, newWordsVer);
  const releaseRef = doc(collection(db, "releases"), `v${maxVersion}`);
  await setDoc(releaseRef, {
    ...pendingData,
    publishedAt: serverTimestamp(),
    publishedBy: adminUid,
    topicsVersionAssigned: newTopicsVer,
    wordsVersionAssigned: newWordsVer
  });

  // 5. Reset Pending
  await setDoc(pendingRef, {
    pendingTopicsCount: 0,
    pendingWordsCount: 0,
    changesSummary: [],
    updatedAt: serverTimestamp()
  });

  await writeAuditLog(adminUid, "PUBLISH_RELEASE", releaseRef.id, {
    topicsVersion: newTopicsVer,
    wordsVersion: newWordsVer,
    topicsCount: pendingData.pendingTopicsCount || 0,
    wordsCount: pendingData.pendingWordsCount || 0,
    summary: (pendingData.changesSummary || []).slice(-5),
  });
}

/**
 * Get recent audit logs with optional filters
 * @param {Object} options
 * @param {number} options.maxCount - Max items to return
 * @param {string} options.actionFilter - Filter by action type (e.g. "CREATE_WORD")
 * @param {Date} options.startDate - Filter logs after this date
 * @param {Date} options.endDate - Filter logs before this date
 */
export async function getAuditLogs({
  maxCount = 50,
  actionFilter = null,
  startDate = null,
  endDate = null,
} = {}) {
  // Support legacy call: getAuditLogs(20)
  if (typeof arguments[0] === "number") {
    maxCount = arguments[0];
    actionFilter = null;
    startDate = null;
    endDate = null;
  }

  let constraints = [];

  if (actionFilter) {
    constraints.push(where("action", "==", actionFilter));
  }

  if (startDate) {
    constraints.push(
      where("timestamp", ">=", Timestamp.fromDate(new Date(startDate)))
    );
  }

  if (endDate) {
    const endOfDay = new Date(endDate);
    endOfDay.setHours(23, 59, 59, 999);
    constraints.push(
      where("timestamp", "<=", Timestamp.fromDate(endOfDay))
    );
  }

  constraints.push(orderBy("timestamp", "desc"));
  constraints.push(limit(maxCount));

  const q = query(collection(db, "adminLogs"), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    timestamp: d.data().timestamp?.toDate?.()?.toISOString() || null,
  }));
}

// ════════════════════════════════════════════
//  DASHBOARD STATS
// ════════════════════════════════════════════

/**
 * Get dashboard statistics.
 * Strategy: Try precomputed analytics first (1 read), fallback to live query.
 */
export async function getDashboardStats() {
  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  // Try precomputed stats first
  try {
    const statsDoc = await getDoc(doc(db, "analytics", `dailyStats_${today}`));
    if (statsDoc.exists()) {
      const data = statsDoc.data();
      // Ensure the cached stats include the new metrics from Phase 3, otherwise recompute
      if (data.retentionD1 !== undefined) {
        return { ...data, source: "precomputed" };
      }
    }
  } catch (err) {
    console.warn("Precomputed stats not available:", err.message);
  }

  // Fallback: compute from live data
  return computeLiveStats();
}

/**
 * Compute stats from live Firestore data (more expensive but always fresh)
 */
async function computeLiveStats() {
  const stats = {
    totalUsers: 0,
    activeToday: 0,
    newUsersWeek: 0,
    totalWords: 0,
    totalTopics: 0,
    totalReviews: 0,
    totalReviews: 0,
    avgAccuracy: 0,
    totalLearnedWords: 0,
    retentionD1: 0,
    retentionD7: 0,
    source: "live",
  };

  try {
    // Count users
    const usersSnap = await getCountFromServer(collection(db, "users"));
    stats.totalUsers = usersSnap.data().count;

    // Count words
    const wordsSnap = await getCountFromServer(collection(db, "words"));
    stats.totalWords = wordsSnap.data().count;

    // Count topics
    const topicsSnap = await getCountFromServer(collection(db, "topics"));
    stats.totalTopics = topicsSnap.data().count;

    // Active users today + new users this week (sample first 200 users)
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString();

    const usersQuery = query(collection(db, "users"), limit(200));
    const usersDocsSnap = await getDocs(usersQuery);

    let totalReviewsSum = 0;
    let totalLapsesSum = 0;
    let usersWithReviews = 0;
    
    let totalLearnedWords = 0;
    let cohortD1 = 0, retainedD1 = 0;
    let cohortD7 = 0, retainedD7 = 0;
    const nowMs = Date.now();

    usersDocsSnap.docs.forEach((d) => {
      const data = d.data();
      // Active today
      if (data.lastStudyDate === today) {
        stats.activeToday++;
      }
      // New this week
      if (data.createdAt && data.createdAt >= weekAgoStr) {
        stats.newUsersWeek++;
      }
      
      // Total learned words
      const lw = data.learnedWords;
      totalLearnedWords += (Array.isArray(lw) ? lw.length : (typeof lw === 'number' ? lw : 0));

      // Retention (Approximate logic)
      const createdAtMs = data.createdAt?.toMillis ? data.createdAt.toMillis() : data.createdAt ? new Date(data.createdAt).getTime() : 0;
      if (createdAtMs) {
        const daysSinceJoin = Math.floor((nowMs - createdAtMs) / (24 * 60 * 60 * 1000));
        const lastStudyMs = data.lastStudyDate ? new Date(data.lastStudyDate).getTime() : 0;
        const daysSinceStudy = Math.floor((nowMs - lastStudyMs) / (24 * 60 * 60 * 1000));

        if (daysSinceJoin >= 1 && daysSinceJoin <= 2) {
          cohortD1++;
          if (daysSinceStudy <= 1) retainedD1++;
        }
        if (daysSinceJoin >= 7 && daysSinceJoin <= 8) {
          cohortD7++;
          if (daysSinceStudy <= 2) retainedD7++;
        }
      }
      // Aggregate reviews for accuracy
      const reviews = data.totalReviews || 0;
      const lapses = data.totalLapses || 0;
      if (reviews > 0) {
        totalReviewsSum += reviews;
        totalLapsesSum += lapses;
        usersWithReviews++;
      }
    });

    stats.totalReviews = totalReviewsSum;
    stats.avgAccuracy =
      totalReviewsSum > 0
        ? Math.round(((totalReviewsSum - totalLapsesSum) / totalReviewsSum) * 100)
        : 0;
    stats.totalLearnedWords = totalLearnedWords;
    stats.retentionD1 = cohortD1 > 0 ? Math.round((retainedD1 / cohortD1) * 100) : 0;
    stats.retentionD7 = cohortD7 > 0 ? Math.round((retainedD7 / cohortD7) * 100) : 0;
  } catch (err) {
    console.error("Error computing live stats:", err);
  }

  return stats;
}

/**
 * Save precomputed daily stats to analytics collection
 */
export async function saveDailyStats(stats) {
  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  try {
    await setDoc(doc(db, "analytics", `dailyStats_${today}`), {
      ...stats,
      computedAt: serverTimestamp(),
    });
  } catch (err) {
    console.error("Failed to save daily stats:", err);
  }
}

/**
 * Fetch historical daily stats for charting
 */
export async function getDailyStatsHistory(days = 7) {
  try {
    const q = query(
      collection(db, "analytics"),
      orderBy("__name__", "desc"),
      limit(days)
    );
    const snap = await getDocs(q);
    const data = snap.docs.map(d => {
      const id = d.id;
      const dateStr = id.replace("dailyStats_", "");
      return {
        date: dateStr,
        ...d.data()
      };
    }).reverse();
    return data;
  } catch(err) {
    console.error("Failed to fetch daily stats history:", err);
    return [];
  }
}

// ════════════════════════════════════════════
//  USER MANAGEMENT
// ════════════════════════════════════════════

/**
 * Get paginated user list
 */
export async function getAllUsers({
  pageSize = 20,
  cursor = null,
  sortField = "lastStudyDate",
  sortDirection = "desc",
} = {}) {
  let q = query(
    collection(db, "users"),
    orderBy(sortField, sortDirection),
    limit(pageSize)
  );

  if (cursor) {
    q = query(
      collection(db, "users"),
      orderBy(sortField, sortDirection),
      startAfter(cursor),
      limit(pageSize)
    );
  }

  const snap = await getDocs(q);
  const users = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const lastDoc = snap.docs[snap.docs.length - 1] || null;

  return { users, lastDoc, hasMore: snap.docs.length === pageSize };
}

/**
 * Get a single user's full document
 */
export async function getUserDetail(uid) {
  const userDoc = await getDoc(doc(db, "users", uid));
  if (!userDoc.exists()) return null;
  return { id: userDoc.id, ...userDoc.data() };
}

/**
 * Get user subcollection with pagination (wordProgress, quizResults, etc.)
 */
export async function getUserSubcollection(
  uid,
  subcollection_name,
  { maxCount = 20, cursor = null, orderField = null, orderDirection = "desc" } = {}
) {
  const ref = collection(db, "users", uid, subcollection_name);
  let q;

  if (orderField) {
    q = cursor
      ? query(ref, orderBy(orderField, orderDirection), startAfter(cursor), limit(maxCount))
      : query(ref, orderBy(orderField, orderDirection), limit(maxCount));
  } else {
    q = cursor
      ? query(ref, startAfter(cursor), limit(maxCount))
      : query(ref, limit(maxCount));
  }

  const snap = await getDocs(q);
  const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const lastDoc = snap.docs[snap.docs.length - 1] || null;

  return { items, lastDoc, hasMore: snap.docs.length === maxCount };
}

/**
 * Update specific admin-allowed fields on a user
 */
export async function updateUserField(adminUid, uid, field, value) {
  const allowedFields = [
    "role", "currentStreak", "longestStreak", "learnedWords",
    "totalXp", "totalReviews", "totalLapses", "topicProgress", "premium",
    "isBanned", "dailyGoal", "learningLevel", "forceSyncRequested"
  ];

  if (!allowedFields.includes(field)) {
    throw new Error(`Field "${field}" is not admin-editable`);
  }

  const before = await getUserDetail(uid);
  await updateDoc(doc(db, "users", uid), { [field]: value });

  await writeAuditLog(adminUid, "UPDATE_USER", uid, {
    field,
    before: before?.[field],
    after: value,
  });
}

// ════════════════════════════════════════════
//  VOCABULARY CMS (Words)
// ════════════════════════════════════════════

/**
 * Get paginated words list
 */
export async function getAllWordsAdmin({
  pageSize = 50,
  cursor = null,
  topicFilter = null,
  includeDeleted = false,
} = {}) {
  let constraints = [];

  if (topicFilter) {
    constraints.push(where("topic_id", "==", topicFilter));
  }

  if (!includeDeleted) {
    // Client-side filter for now (Firestore != queries need composite index)
  }

  constraints.push(orderBy("word", "asc"));
  constraints.push(limit(pageSize));

  if (cursor) {
    constraints.push(startAfter(cursor));
  }

  const q = query(collection(db, "words"), ...constraints);
  const snap = await getDocs(q);
  let words = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  // Client-side filter for deleted
  if (!includeDeleted) {
    words = words.filter((w) => !w.deleted);
  }

  const lastDoc = snap.docs[snap.docs.length - 1] || null;
  return { words, lastDoc, hasMore: snap.docs.length === pageSize };
}

/**
 * Create a new word
 */
export async function createWord(adminUid, wordData) {
  const data = {
    word: wordData.word?.trim() || "",
    pronunciation: wordData.pronunciation?.trim() || "",
    meaning: wordData.meaning?.trim() || "",
    example: wordData.example?.trim() || "",
    topic_id: wordData.topic_id || "",
    pos: wordData.pos || "",
    difficulty_level: wordData.difficulty_level || 1,
    image_url: wordData.image_url || null,
    audio_url: wordData.audio_url || null,
    is_learned: 1, // 1 = chưa học (mobile inverted logic)
    is_favorite: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    contentVersion: 0,
  };

  const ref = await addDoc(collection(db, "words"), data);
  await _recordPendingChange("wordsVersion", 1, `➕ Thêm từ mới: ${data.word}`);

  // Increment topic word count + content version
  if (data.topic_id) {
    try {
      await updateDoc(doc(db, "topics", data.topic_id), {
        total_words: increment(1),
      });
    } catch (err) {
      console.warn("Could not update topic word count:", err);
    }
  }

  await writeAuditLog(adminUid, "CREATE_WORD", ref.id, { word: data.word, meaning: data.meaning, topic_id: data.topic_id, pos: data.pos });
  return { id: ref.id, ...data };
}

/**
 * Update an existing word
 */
export async function updateWord(adminUid, wordId, changes) {
  const before = await getDoc(doc(db, "words", wordId));
  const beforeData = before.exists() ? before.data() : {};

  await updateDoc(doc(db, "words", wordId), {
    ...changes,
    updated_at: new Date().toISOString(),
    contentVersion: 0
  });

  await _recordPendingChange("wordsVersion", 1, `✏️ Sửa từ vựng`);

  // Build before/after diff for audit log
  const changedFields = Object.keys(changes);
  const diff = {};
  changedFields.forEach((field) => {
    diff[field] = { before: beforeData[field] ?? null, after: changes[field] ?? null };
  });

  await writeAuditLog(adminUid, "UPDATE_WORD", wordId, {
    word: beforeData.word,
    changedFields,
    diff,
  });
}

/**
 * Soft delete a word
 */
export async function softDeleteWord(adminUid, wordId) {
  const before = await getDoc(doc(db, "words", wordId));
  const beforeData = before.exists() ? before.data() : {};

  await updateDoc(doc(db, "words", wordId), {
    deleted: true,
    deletedAt: new Date().toISOString(),
    deletedBy: adminUid,
    contentVersion: 0
  });
  await _recordPendingChange("wordsVersion", 1, `🗑️ Xoá từ vựng`);

  // Decrement topic word count
  if (beforeData.topic_id) {
    try {
      await updateDoc(doc(db, "topics", beforeData.topic_id), {
        total_words: increment(-1),
      });
    } catch (err) {
      console.warn("Could not update topic word count:", err);
    }
  }

  await writeAuditLog(adminUid, "SOFT_DELETE_WORD", wordId, {
    word: beforeData.word,
  });
}

/**
 * Restore a soft-deleted word
 */
export async function restoreWord(adminUid, wordId) {
  await updateDoc(doc(db, "words", wordId), {
    deleted: false,
    deletedAt: null,
    deletedBy: null,
  });

  const wordDoc = await getDoc(doc(db, "words", wordId));
  const wordData = wordDoc.data();

  if (wordData?.topic_id) {
    try {
      await updateDoc(doc(db, "topics", wordData.topic_id), {
        total_words: increment(1),
      });
    } catch (err) {
      console.warn("Could not update topic word count:", err);
    }
  }

  await writeAuditLog(adminUid, "RESTORE_WORD", wordId, {
    word: wordData?.word,
  });
}

/**
 * Batch import words (chunked, max 300 per batch)
 */
export async function batchImportWords(adminUid, wordsArray) {
  const MAX_PER_BATCH = 300;
  const MAX_TOTAL = 1000;

  if (wordsArray.length > MAX_TOTAL) {
    throw new Error(`Tối đa ${MAX_TOTAL} từ mỗi lần import. Bạn đang import ${wordsArray.length} từ.`);
  }

  const results = { imported: 0, errors: [] };
  const topicIncrements = {};

  const updateType = wordsArray.length > 500 ? 'major' : 'minor';
  await _recordPendingChange("wordsVersion", wordsArray.length, `🚀 Import ${wordsArray.length} từ vựng`);

  for (let i = 0; i < wordsArray.length; i += MAX_PER_BATCH) {
    const chunk = wordsArray.slice(i, i + MAX_PER_BATCH);
    const batch = writeBatch(db);

    chunk.forEach((word, idx) => {
      try {
        if (!word.topic_id) {
          throw new Error(`Từ "${word.word || 'N/A'}" thiếu Chủ đề (topic_id). Không thể import từ mồ côi!`);
        }

        const ref = doc(collection(db, "words"));
        batch.set(ref, {
          word: word.word?.trim() || "",
          pronunciation: word.pronunciation?.trim() || "",
          meaning: word.meaning?.trim() || "",
          example: word.example?.trim() || "",
          topic_id: word.topic_id,
          pos: word.pos || "",
          difficulty_level: word.difficulty_level || 1,
          image_url: word.image_url || null,
          audio_url: word.audio_url || null,
          is_learned: 1,
          is_favorite: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          contentVersion: 0,
          deleted: false,
        });

        topicIncrements[word.topic_id] = (topicIncrements[word.topic_id] || 0) + 1;
      } catch (err) {
        results.errors.push({ index: i + idx, word: word.word, error: err.message });
      }
    });

    try {
      await batch.commit();
      results.imported += chunk.length - results.errors.filter(e => e.index >= i && e.index < i + MAX_PER_BATCH).length;
    } catch (err) {
      results.errors.push({ batch: Math.floor(i / MAX_PER_BATCH), error: err.message });
    }

    // 500ms delay between batches to avoid rate limiting
    if (i + MAX_PER_BATCH < wordsArray.length) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  // Update topic word counts
  for (const [topicId, count] of Object.entries(topicIncrements)) {
    try {
      await updateDoc(doc(db, "topics", topicId), {
        total_words: increment(count),
      });
    } catch (err) {
      console.warn(`Could not update word count for topic ${topicId}:`, err);
    }
  }

  await writeAuditLog(adminUid, "BATCH_IMPORT", null, {
    imported: results.imported,
    errors: results.errors.length,
    topics: Object.keys(topicIncrements),
    topicCounts: topicIncrements,
  });

  return results;
}

// ════════════════════════════════════════════
//  TOPIC MANAGEMENT
// ════════════════════════════════════════════

/**
 * Get all topics (small collection, no pagination needed)
 */
export async function getTopicsAdmin() {
  const q = query(collection(db, "topics"), orderBy("order_index", "asc"));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((t) => !t.deleted);
}

/**
 * Create a new topic
 */
export async function createTopic(adminUid, topicData) {
  const data = {
    name: topicData.name?.trim() || "",
    description: topicData.description?.trim() || "",
    icon_url: topicData.icon_url || "",
    color_hex: topicData.color_hex || "#3b82f6",
    total_words: 0,
    order_index: topicData.order_index || 0,
    parent_id: topicData.parent_id || null,
    is_unlocked: 1,
    image_url: topicData.image_url || null,
    status: topicData.status || "published",
    contentVersion: 0,
  };

  const ref = await addDoc(collection(db, "topics"), data);
  await _recordPendingChange("topicsVersion", 1, `➕ Thêm chủ đề: ${topicData.name}`);

  await writeAuditLog(adminUid, "CREATE_TOPIC", ref.id, { name: data.name, parent_id: data.parent_id || null, icon_url: data.icon_url || null });
  return { id: ref.id, ...data };
}

/**
 * Update a topic
 */
export async function updateTopic(adminUid, topicId, changes) {
  await updateDoc(doc(db, "topics", topicId), {
    ...changes,
    contentVersion: 0
  });
  await _recordPendingChange("topicsVersion", 1, `✏️ Sửa chủ đề`);

  await writeAuditLog(adminUid, "UPDATE_TOPIC", topicId, {
    changedFields: Object.keys(changes),
    changes: Object.fromEntries(Object.entries(changes).filter(([k]) => k !== 'contentVersion')),
  });
}

/**
 * Delete a topic
 */
export async function deleteTopic(adminUid, topicId, topicName) {
  // Soft-delete: mark as deleted so mobile sync can detect it
  await updateDoc(doc(db, "topics", topicId), {
    deleted: true,
    deletedAt: new Date().toISOString(),
    deletedBy: adminUid,
    contentVersion: 0
  });
  await _recordPendingChange("topicsVersion", 1, `🗑️ Xoá chủ đề: ${topicName}`);

  await writeAuditLog(adminUid, "DELETE_TOPIC", topicId, { name: topicName });
}

/**
 * Reorder topics (batch update order_index)
 */
export async function reorderTopics(adminUid, orderedIds) {
  const batch = writeBatch(db);
  orderedIds.forEach((id, index) => {
    batch.update(doc(db, "topics", id), { order_index: index, contentVersion: 0 });
  });
  await batch.commit();
  await _recordPendingChange("topicsVersion", orderedIds.length, `🔃 Sắp xếp lại ${orderedIds.length} chủ đề`);

  await writeAuditLog(adminUid, "REORDER_TOPICS", null, {
    count: orderedIds.length,
  });
}

// ════════════════════════════════════════════
//  SYNC MONITORING
// ════════════════════════════════════════════

/**
 * Get sync overview — users sorted by lastSyncedAt
 */
export async function getSyncOverview({ pageSize = 20, cursor = null } = {}) {
  let q = query(
    collection(db, "users"),
    orderBy("lastSyncedAt", "desc"),
    limit(pageSize)
  );

  if (cursor) {
    q = query(
      collection(db, "users"),
      orderBy("lastSyncedAt", "desc"),
      startAfter(cursor),
      limit(pageSize)
    );
  }

  const snap = await getDocs(q);
  const users = snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      displayName: data.displayName || "Unknown",
      email: data.email || "",
      lastSyncedAt: data.lastSyncedAt?.toDate?.()?.toISOString() || data.lastSyncedAt || null,
      lastChangeSource: data.lastChangeSource || "unknown",
      learnedWords: data.learnedWords || 0,
      totalXp: data.totalXp || 0,
    };
  });

  const lastDoc = snap.docs[snap.docs.length - 1] || null;
  return { users, lastDoc, hasMore: snap.docs.length === pageSize };
}

// ════════════════════════════════════════════
//  CHART DATA
// ════════════════════════════════════════════

/**
 * Get streak distribution from user sample
 */
export async function getStreakDistribution() {
  const q = query(collection(db, "users"), limit(200));
  const snap = await getDocs(q);

  const buckets = { "0": 0, "1-7": 0, "8-30": 0, "30+": 0 };

  snap.docs.forEach((d) => {
    const streak = d.data().currentStreak || 0;
    if (streak === 0) buckets["0"]++;
    else if (streak <= 7) buckets["1-7"]++;
    else if (streak <= 30) buckets["8-30"]++;
    else buckets["30+"]++;
  });

  return Object.entries(buckets).map(([name, value]) => ({ name, value }));
}

/**
 * Get top topics by total words
 */
export async function getTopTopics() {
  const topics = await getTopicsAdmin();
  return topics
    .filter((t) => !t.parent_id) // Only parent topics
    .sort((a, b) => (b.total_words || 0) - (a.total_words || 0))
    .slice(0, 8)
    .map((t) => ({
      name: t.name,
      words: t.total_words || 0,
      color: t.color_hex || "#3b82f6",
    }));
}

/**
 * Get pending release data
 */
export async function getPendingRelease() {
  try {
    const snap = await getDoc(doc(db, "system", "pendingRelease"));
    if (snap.exists()) {
      return snap.data();
    }
    return { pendingWordsCount: 0, pendingTopicsCount: 0, changesSummary: [] };
  } catch (err) {
    console.error("Failed to get pending release:", err);
    return { pendingWordsCount: 0, pendingTopicsCount: 0, changesSummary: [] };
  }
}

/**
 * Get actual draft items (contentVersion == 0) for detail view
 */
export async function getDraftItems() {
  try {
    const [topicsSnap, wordsSnap] = await Promise.all([
      getDocs(query(collection(db, "topics"), where("contentVersion", "==", 0))),
      getDocs(query(collection(db, "words"), where("contentVersion", "==", 0), limit(200)))
    ]);

    const draftTopics = topicsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const draftWords = wordsSnap.docs.map(d => ({ id: d.id, word: d.data().word, meaning: d.data().meaning, topic_id: d.data().topic_id }));

    return { draftTopics, draftWords };
  } catch (err) {
    console.error("Failed to get draft items:", err);
    return { draftTopics: [], draftWords: [] };
  }
}

/**
 * Get XP distribution from user sample
 */
export async function getXpDistribution() {
  const q = query(collection(db, "users"), limit(200));
  const snap = await getDocs(q);

  const buckets = { "0-100": 0, "100-500": 0, "500-1000": 0, "1000-5000": 0, "5000+": 0 };

  snap.docs.forEach((d) => {
    const xp = d.data().totalXp || 0;
    if (xp < 100) buckets["0-100"]++;
    else if (xp < 500) buckets["100-500"]++;
    else if (xp < 1000) buckets["500-1000"]++;
    else if (xp < 5000) buckets["1000-5000"]++;
    else buckets["5000+"]++;
  });

  return Object.entries(buckets).map(([name, value]) => ({ name, value }));
}

// ════════════════════════════════════════════
//  SYSTEM SETTINGS
// ════════════════════════════════════════════

/**
 * Get current content version from system/contentVersion doc
 */
export async function getContentVersion() {
  try {
    const snap = await getDoc(doc(db, "system", "contentVersion"));
    if (snap.exists()) {
      const data = snap.data();
      return {
        wordsVersion: data.wordsVersion || 0,
        topicsVersion: data.topicsVersion || 0,
        lastUpdatedAt: data.lastUpdatedAt?.toDate?.()?.toISOString() || null,
      };
    }
    return { wordsVersion: 0, topicsVersion: 0, lastUpdatedAt: null };
  } catch (err) {
    console.error("Failed to get content version:", err);
    return { wordsVersion: 0, topicsVersion: 0, lastUpdatedAt: null };
  }
}

/**
 * Manually bump content version (force mobile clients to sync)
 * @param {string} adminUid - Admin performing the action
 * @param {string} type - "words" or "topics" or "both"
 */
export async function bumpContentVersion(adminUid, type = "both") {
  const updates = { lastUpdatedAt: serverTimestamp() };

  if (type === "words" || type === "both") {
    updates.wordsVersion = increment(1);
  }
  if (type === "topics" || type === "both") {
    updates.topicsVersion = increment(1);
  }

  await setDoc(doc(db, "system", "contentVersion"), updates, { merge: true });

  await writeAuditLog(adminUid, "BUMP_VERSION", null, { type });
}

/**
 * Get all users who have an admin-level role (superadmin, admin, editor)
 */
export async function getAdminUsers() {
  const roles = ["superadmin", "admin", "editor"];
  const admins = [];

  for (const role of roles) {
    try {
      const q = query(collection(db, "users"), where("role", "==", role));
      const snap = await getDocs(q);
      snap.docs.forEach((d) => {
        admins.push({ id: d.id, ...d.data() });
      });
    } catch (err) {
      console.warn(`Failed to query role ${role}:`, err);
    }
  }

  return admins;
}

// ════════════════════════════════════════════
//  DASHBOARD WIDGETS
// ════════════════════════════════════════════

/**
 * Get recently active users (by lastStudyDate)
 */
export async function getRecentActiveUsers(count = 5) {
  const q = query(
    collection(db, "users"),
    orderBy("lastStudyDate", "desc"),
    limit(count)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      displayName: data.displayName || "Unknown",
      email: data.email || "",
      totalXp: data.totalXp || 0,
      lastStudyDate: data.lastStudyDate || null,
      lastChangeSource: data.lastChangeSource || "unknown",
      currentStreak: data.currentStreak || 0,
    };
  });
}

/**
 * Get all-time top learners by XP
 */
export async function getTopLearners(count = 5) {
  const q = query(
    collection(db, "users"),
    orderBy("totalXp", "desc"),
    limit(count)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      displayName: data.displayName || "Unknown",
      email: data.email || "",
      totalXp: data.totalXp || 0,
      currentStreak: data.currentStreak || 0,
      learnedWords: data.learnedWords || 0,
    };
  });
}

// ════════════════════════════════════════════
//  DUPLICATE DETECTION
// ════════════════════════════════════════════

/**
 * Check for duplicate words in Firestore
 * Queries by normalized (lowercase, trimmed) word values
 * @param {string[]} wordsList - Array of words to check
 * @returns {Object} Map of normalizedWord → existing word doc
 */
export async function checkDuplicateWords(wordsList) {
  if (!wordsList || wordsList.length === 0) return {};

  // Normalize input
  const normalized = wordsList.map((w) => w.trim().toLowerCase()).filter(Boolean);
  const unique = [...new Set(normalized)];

  const duplicates = {};

  // Firestore `in` max 10 items per query
  for (let i = 0; i < unique.length; i += 10) {
    const chunk = unique.slice(i, i + 10);
    try {
      const q = query(
        collection(db, "words"),
        where("word", "in", chunk)
      );
      const snap = await getDocs(q);
      snap.docs.forEach((d) => {
        const word = d.data().word;
        const key = word?.trim().toLowerCase();
        if (key) duplicates[key] = { id: d.id, ...d.data() };
      });
    } catch (err) {
      console.warn("Duplicate check chunk failed:", err);
    }
  }

  return duplicates;
}

// ════════════════════════════════════════════
//  ADMIN ROLE MANAGEMENT (RBAC)
// ════════════════════════════════════════════

// (getAdminUsers is defined above in ADMIN section)

/**
 * Change a user's admin role (superadmin only)
 */
export async function changeUserRole(adminUid, targetUid, newRole) {
  const validRoles = ["superadmin", "admin", "editor", "user"];
  if (!validRoles.includes(newRole)) {
    throw new Error(`Invalid role: ${newRole}`);
  }

  const before = await getUserDetail(targetUid);
  await updateDoc(doc(db, "users", targetUid), { role: newRole });

  await writeAuditLog(adminUid, "CHANGE_ROLE", targetUid, {
    field: "role",
    before: before?.role,
    after: newRole,
    targetName: before?.displayName || targetUid,
  });
}

// ════════════════════════════════════════════
//  FEATURE FLAGS
// ════════════════════════════════════════════

const FLAGS_DOC = "config/featureFlags";

/**
 * Get all feature flags
 */
export async function getFeatureFlags() {
  try {
    const snap = await getDoc(doc(db, FLAGS_DOC));
    if (snap.exists()) {
      return snap.data();
    }
    return { flags: {}, updatedAt: null, updatedBy: null };
  } catch (err) {
    console.error("Failed to get feature flags:", err);
    return { flags: {}, updatedAt: null, updatedBy: null };
  }
}

/**
 * Toggle a single feature flag
 */
export async function toggleFeatureFlag(adminUid, flagKey, enabled) {
  await setDoc(doc(db, FLAGS_DOC), {
    [`flags.${flagKey}.enabled`]: enabled,
    updatedAt: serverTimestamp(),
    updatedBy: adminUid,
  }, { merge: true });

  await writeAuditLog(adminUid, "TOGGLE_FLAG", flagKey, {
    flag: flagKey,
    enabled,
  });
}

/**
 * Create a new feature flag
 */
export async function createFeatureFlag(adminUid, flagKey, label, description) {
  await setDoc(doc(db, FLAGS_DOC), {
    [`flags.${flagKey}`]: {
      enabled: false,
      label,
      description,
      createdAt: new Date().toISOString(),
    },
    updatedAt: serverTimestamp(),
    updatedBy: adminUid,
  }, { merge: true });

  await writeAuditLog(adminUid, "CREATE_FLAG", flagKey, { label });
}

/**
 * Delete a feature flag
 */
export async function deleteFeatureFlag(adminUid, flagKey) {
  // We need to read current flags, remove the key, and write back
  const current = await getFeatureFlags();
  const flags = { ...current.flags };
  delete flags[flagKey];

  await setDoc(doc(db, FLAGS_DOC), {
    flags,
    updatedAt: serverTimestamp(),
    updatedBy: adminUid,
  });

  await writeAuditLog(adminUid, "DELETE_FLAG", flagKey, { flag: flagKey });
}

// ════════════════════════════════════════════
//  ANNOUNCEMENTS
// ════════════════════════════════════════════

/**
 * Get all announcements sorted by priority
 */
export async function getAnnouncements() {
  const q = query(collection(db, "announcements"), orderBy("priority", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Create a new announcement
 */
export async function createAnnouncement(adminUid, data) {
  const docData = {
    ...data,
    createdBy: adminUid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const ref = await addDoc(collection(db, "announcements"), docData);
  await writeAuditLog(adminUid, "CREATE_ANNOUNCEMENT", ref.id, { title: data.title });
  return ref.id;
}

/**
 * Update an announcement
 */
export async function updateAnnouncement(adminUid, id, data) {
  await updateDoc(doc(db, "announcements", id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
  await writeAuditLog(adminUid, "UPDATE_ANNOUNCEMENT", id, { title: data.title });
}

/**
 * Delete an announcement
 */
export async function deleteAnnouncement(adminUid, id) {
  const before = await getDoc(doc(db, "announcements", id));
  await deleteDoc(doc(db, "announcements", id));
  await writeAuditLog(adminUid, "DELETE_ANNOUNCEMENT", id, {
    title: before.data()?.title,
  });
}

// ════════════════════════════════════════════
//  FEEDBACK & SUPPORT
// ════════════════════════════════════════════

/**
 * Get feedback tickets with optional filters
 */
export async function getFeedbackTickets({ type, status, pageSize = 50 } = {}) {
  let q;
  const constraints = [collection(db, "feedback")];

  if (type && status) {
    q = query(...constraints, where("type", "==", type), where("status", "==", status), orderBy("createdAt", "desc"), limit(pageSize));
  } else if (type) {
    q = query(...constraints, where("type", "==", type), orderBy("createdAt", "desc"), limit(pageSize));
  } else if (status) {
    q = query(...constraints, where("status", "==", status), orderBy("createdAt", "desc"), limit(pageSize));
  } else {
    q = query(...constraints, orderBy("createdAt", "desc"), limit(pageSize));
  }

  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Get count of new (unresolved) feedback tickets
 */
export async function getNewFeedbackCount() {
  try {
    const q = query(collection(db, "feedback"), where("status", "==", "new"));
    const snap = await getCountFromServer(q);
    return snap.data().count;
  } catch {
    return 0;
  }
}

/**
 * Update feedback ticket status, admin note, and priority
 */
export async function updateFeedbackTicket(adminUid, ticketId, { status, adminNote, priority }) {
  const updates = { updatedAt: serverTimestamp() };
  if (status) {
    updates.status = status;
    updates.resolvedBy = adminUid;
  }
  if (adminNote !== undefined) {
    updates.adminNote = adminNote;
  }
  if (priority !== undefined) {
    updates.priority = priority;
  }

  await updateDoc(doc(db, "feedback", ticketId), updates);

  await writeAuditLog(adminUid, "UPDATE_FEEDBACK", ticketId, {
    status,
    priority,
    adminNote: adminNote?.substring(0, 100),
  });
}

/**
 * Soft delete a feedback ticket
 */
export async function softDeleteFeedback(adminUid, ticketId) {
  await updateDoc(doc(db, "feedback", ticketId), {
    deleted: true,
    deletedAt: serverTimestamp(),
    deletedBy: adminUid,
  });
  await writeAuditLog(adminUid, "DELETE_FEEDBACK", ticketId, {});
}
