import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.raw({ type: "*/*" })); // IMPORTANT: supports ALL body types

app.use(async (req, res) => {
  try {
    const targetUrl =
      "http://51.107.0.26" + req.originalUrl.replace("/proxy", "");

    // Clone headers safely
    const headers = { ...req.headers };
    delete headers.host;
    delete headers["content-length"]; // let fetch recalc it

    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers,
      body:
        req.method === "GET" || req.method === "HEAD"
          ? undefined
          : req.body,
    });

    // ✅ Forward status EXACTLY
    res.status(upstream.status);

    // ✅ Forward ALL headers EXACTLY
    upstream.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    // ✅ Forward raw body EXACTLY (not JSON-forced)
    const buffer = await upstream.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (err) {
    res.status(500).json({
      error: "Proxy failed",
      details: err.message,
    });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Exact mirror proxy running on port 3000");
});
