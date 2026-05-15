/**
 * Thuật toán Spaced Repetition (SM-2) mô phỏng chính xác logic của ứng dụng Flutter.
 * Đảm bảo quá trình học web và app đồng bộ 100%.
 */

/**
 * Tính toán trạng thái lịch ôn tiếp theo dựa trên chất lượng câu trả lời.
 * 
 * @param {number} quality Chất lượng câu trả lời (0-5, thường: 0=sai hoàn toàn, 3=đúng chật vật, 4=đúng do dự, 5=đúng ngay lập tức)
 * @param {number} repetitions Số lần lặp lại đúng liên tiếp trước đó
 * @param {number} easeFactor Hệ số dễ dàng trước đó (mặc định 2.5)
 * @param {number} interval Khoảng cách ngày trước đó (mặc định 1)
 * @returns {object} { nextReviewDate, repetitions, easeFactor, interval }
 */
export function calculateSM2(quality, repetitions = 0, easeFactor = 2.5, interval = 1) {
  let newRepetitions;
  let newInterval;
  let newEaseFactor;

  // Nếu sai (quality < 3) -> Reset repetitions
  if (quality < 3) {
    newRepetitions = 0;
    newInterval = 1;
  } else {
    newRepetitions = repetitions + 1;
    if (newRepetitions === 1) {
      newInterval = 1;
    } else if (newRepetitions === 2) {
      newInterval = 6;
    } else {
      newInterval = Math.round(interval * easeFactor);
    }
  }

  // Luôn cập nhật easeFactor
  newEaseFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  
  // Giới hạn easeFactor thấp nhất là 1.3 để không bị lặp lại quá mức cực đoan
  if (newEaseFactor < 1.3) {
    newEaseFactor = 1.3;
  }

  // Ngày ôn lần tới
  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + newInterval);

  return {
    repetition: newRepetitions,
    easinessFactor: parseFloat(newEaseFactor.toFixed(2)),
    intervalDays: newInterval,
    nextReviewDate: nextDate.toISOString(),
    lastReviewDate: new Date().toISOString()
  };
}
