const express = require("express");
const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const url = req.query.url;
    if (!url) return res.status(400).json({ error: "Missing url" });

    const decoded = decodeURIComponent(url);
    if (!decoded.startsWith("https://res.cloudinary.com") && !decoded.startsWith("http://res.cloudinary.com"))
      return res.status(403).json({ error: "Domain not allowed" });

    const fetchRes = await fetch(decoded);
    if (!fetchRes.ok) return res.status(fetchRes.status).end();

    const contentType = fetchRes.headers.get("content-type") || "image/jpeg";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(Buffer.from(await fetchRes.arrayBuffer()));
  } catch (err) {
    res.status(500).end();
  }
});

module.exports = router;
