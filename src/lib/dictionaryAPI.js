const BASE_URL = "https://api.dictionaryapi.dev/api/v2/entries/en";

/**
 * Look up a word using the Free Dictionary API
 * @param {string} word - The English word to look up
 * @returns {object|null} Parsed word data or null if not found
 */
export async function lookupWord(word) {
  try {
    const res = await fetch(`${BASE_URL}/${encodeURIComponent(word.toLowerCase())}`);
    if (!res.ok) return null;

    const data = await res.json();
    if (!data || data.length === 0) return null;

    const entry = data[0];

    // 3. Translate all English definitions to Vietnamese using Google Translate free endpoint
    const textsToTranslate = [];
    const paths = [];

    entry.meanings?.forEach((m, mIndex) => {
      m.definitions?.forEach((def, dIndex) => {
        if (def.definition) {
          textsToTranslate.push(def.definition);
          paths.push({ mIndex, dIndex });
        }
      });
    });

    if (textsToTranslate.length > 0) {
      try {
        const combinedText = textsToTranslate.join(" |###| ");
        const translateUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=vi&dt=t&q=${encodeURIComponent(combinedText)}`;
        const translateRes = await fetch(translateUrl);
        if (translateRes.ok) {
          const decoded = await translateRes.json();
          const translations = decoded[0];
          const translatedText = translations.map(t => t[0]).join("");
          const parts = translatedText.split(" |###| ");

          parts.forEach((viText, i) => {
            if (i < paths.length) {
              const p = paths[i];
              entry.meanings[p.mIndex].definitions[p.dIndex].definitionVi = viText.trim();
            }
          });
        }
      } catch (err) {
        console.error("Translation failed:", err);
      }
    }

    // 4. Parse all meanings
    const meanings = [];
    const allDefinitions = [];

    entry.meanings?.forEach((m) => {
      m.definitions?.forEach((def) => {
        allDefinitions.push({
          pos: m.partOfSpeech,
          definition: def.definition,
          definitionVi: def.definitionVi || null,
          example: def.example || null,
          synonyms: def.synonyms || [],
          antonyms: def.antonyms || [],
        });
      });
    });

    // Collect top-level synonyms and antonyms
    const synonyms = [...new Set(entry.meanings?.flatMap((m) => m.synonyms || []).slice(0, 8))];
    const antonyms = [...new Set(entry.meanings?.flatMap((m) => m.antonyms || []).slice(0, 8))];

    // Find audio URL
    const audioUrl = entry.phonetics?.find((p) => p.audio)?.audio || null;
    const phoneticText = entry.phonetic || entry.phonetics?.find((p) => p.text)?.text || "";

    return {
      word: entry.word,
      phonetic: phoneticText,
      audioUrl,
      partOfSpeech: entry.meanings?.[0]?.partOfSpeech || "",
      definitions: allDefinitions,
      synonyms,
      antonyms,
      sourceUrl: entry.sourceUrls?.[0] || null,
    };
  } catch (err) {
    console.error("Dictionary API error:", err);
    return null;
  }
}
