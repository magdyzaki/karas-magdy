const express = require("express");
const router = express.Router();
const protect = require("../middleware/auth.middleware");

// Giphy (يحتاج مفتاح من developers.giphy.com)
const GIPHY_API_KEY = process.env.GIPHY_API_KEY;
const GIPHY_BASE = "https://api.giphy.com/v1/gifs";

// Tenor (مفتاح تجريبي عام - يعمل بدون إعداد)
const TENOR_KEY = process.env.TENOR_API_KEY || "LIVDSRZULELA";
const TENOR_BASE = "https://g.tenor.com/v1";

function mapTenorToGifs(data) {
  const results = data.results || [];
  return results.map((g) => {
    const media = Array.isArray(g.media) ? g.media[0] : g.media;
    const url = media?.tinygif?.url || media?.gif?.url || media?.mediumgif?.url || "";
    return { id: g.id, url, title: g.title || g.content_description || "" };
  });
}

async function fetchGiphyTrending(limit) {
  try {
    const url = `${GIPHY_BASE}/trending?api_key=${GIPHY_API_KEY}&limit=${limit}&rating=g`;
    const resp = await fetch(url);
    const data = await resp.json();
    if (!resp.ok || (data.meta && data.meta.status !== 200)) return null;
  return (data.data || []).map((g) => ({
    id: g.id,
    url: g.images?.fixed_height?.url || g.images?.original?.url,
    title: g.title || "",
  }));
  } catch (e) {
    return null;
  }
}

async function fetchGiphySearch(q, limit, offset) {
  try {
    const url = `${GIPHY_BASE}/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(q)}&limit=${limit}&offset=${offset}&rating=g`;
    const resp = await fetch(url);
    const data = await resp.json();
    if (!resp.ok || (data.meta && data.meta.status !== 200)) return null;
    return (data.data || []).map((g) => ({
      id: g.id,
      url: g.images?.fixed_height?.url || g.images?.original?.url,
      title: g.title || "",
    }));
  } catch (e) {
    return null;
  }
}

async function fetchTenorTrending(limit) {
  const url = `${TENOR_BASE}/trending?key=${TENOR_KEY}&limit=${limit}`;
  const resp = await fetch(url);
  const data = await resp.json();
  return mapTenorToGifs(data);
}

async function fetchTenorSearch(q, limit, pos = "") {
  const params = new URLSearchParams({ key: TENOR_KEY, q, limit });
  if (pos) params.set("pos", pos);
  const url = `${TENOR_BASE}/search?${params}`;
  const resp = await fetch(url);
  const data = await resp.json();
  return mapTenorToGifs(data);
}

router.get("/search", protect, async (req, res) => {
  try {
    const { q, limit = 20, offset = 0 } = req.query;
    const limitNum = Math.min(50, parseInt(limit) || 20);
    const searchQ = (q || "funny").trim();

    let items = [];
    if (GIPHY_API_KEY) {
      items = await fetchGiphySearch(searchQ, limitNum, parseInt(offset) || 0);
    }
    if (!items || items.length === 0) {
      items = await fetchTenorSearch(searchQ, limitNum);
    }

    res.json({ success: true, gifs: items || [] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/trending", protect, async (req, res) => {
  try {
    const limit = Math.min(30, parseInt(req.query.limit) || 20);

    let items = [];
    if (GIPHY_API_KEY) {
      items = await fetchGiphyTrending(limit);
    }
    if (!items || items.length === 0) {
      items = await fetchTenorTrending(limit);
    }

    res.json({ success: true, gifs: items || [] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
