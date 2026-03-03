const playdl = require("play-dl");
const https = require("https");
const http = require("http");

const streamAudio = async (req, res) => {
  const { videoId } = req.params;

  if (!videoId) {
    return res.status(400).json({ message: "videoId is required" });
  }

  console.log(`[Stream] play-dl request for videoId: ${videoId}`);

  try {
    // play-dl handles authentication/deciphering much better
    const stream = await playdl.stream(`https://www.youtube.com/watch?v=${videoId}`, {
        quality: 1, // best audio
        discordPlayerCompatibility: true // provides a clear stream
    });

    if (!stream || !stream.url) {
        throw new Error("Could not extract stream URL");
    }

    console.log(`[Stream] Got source URL for ${videoId}. Proxying...`);

    // Set streaming headers
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Cache-Control", "no-cache");

    const transport = stream.url.startsWith("https") ? https : http;

    const ytReq = transport.get(stream.url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://www.youtube.com/",
        "Range": req.headers.range || "bytes=0-"
      }
    }, (ytRes) => {
      // Forward relevant headers
      if (ytRes.headers["content-type"]) res.setHeader("Content-Type", ytRes.headers["content-type"]);
      if (ytRes.headers["content-length"]) res.setHeader("Content-Length", ytRes.headers["content-length"]);
      if (ytRes.headers["content-range"]) res.setHeader("Content-Range", ytRes.headers["content-range"]);
      
      res.status(ytRes.statusCode || 200);
      ytRes.pipe(res);
    });

    ytReq.on("error", (err) => {
      console.error(`[Stream] Proxy error:`, err.message);
      if (!res.headersSent) res.status(500).send("Stream error");
    });

    req.on("close", () => {
      ytReq.destroy();
    });

  } catch (err) {
    console.error(`[Stream] play-dl Error:`, err.message);
    if (!res.headersSent) {
      res.status(500).json({ message: "Stream failed", error: err.message });
    }
  }
};

module.exports = { streamAudio };
