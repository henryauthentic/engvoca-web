const UNSPLASH_ACCESS_KEY = "AzDeNNv11ZcRhGmC4-JpkhwGhulA2H25Lf5J5afRGps";

const cache = new Map();
const loading = new Set();

export async function getUnsplashImage(word) {
  const key = word.toLowerCase().trim();
  
  if (cache.has(key)) {
    const images = cache.get(key);
    if (!images || images.length === 0) return null;
    return images[Math.floor(Math.random() * images.length)];
  }

  if (loading.has(key)) return null;

  loading.add(key);
  try {
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(key)}&per_page=3&orientation=landscape`;
    const res = await fetch(url, {
      headers: {
        'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}`,
        'Accept-Version': 'v1',
      }
    });

    if (!res.ok) {
      loading.delete(key);
      cache.set(key, []);
      return null;
    }

    const data = await res.json();
    const results = data.results || [];
    
    const images = results.map(img => ({
      imageUrl: img.urls?.regular || img.urls?.small || "",
      authorName: img.user?.name || "Unknown",
    })).filter(img => img.imageUrl !== "");

    cache.set(key, images);
    loading.delete(key);

    if (images.length === 0) return null;
    return images[Math.floor(Math.random() * images.length)];
  } catch (err) {
    console.error("Unsplash API error:", err);
    cache.set(key, []);
    loading.delete(key);
    return null;
  }
}
