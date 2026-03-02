const play = require("play-dl");
const https = require("https");
const http = require("http");

const streamAudio = async (req, res) => {
  const { videoId } = req.params;

  if (!videoId) {
    return res.status(400).json({ message: "videoId is required" });
  }

  const url = `https://www.youtube.com/watch?v=${videoId}`;
  console.log(`[Stream] Request for videoId: ${videoId}`);

  try {
    // Get info and all formats
    const info = await play.video_info(url);
    const formats = info.format || [];

    if (!formats.length) {
      return res.status(404).json({ message: "No formats found" });
    }

    // Find the best audio-only format (typically opus/webm or aac/mp4)
    const audioFormats = formats.filter(
      (f) => f.mimeType && f.mimeType.includes("audio") && f.url
    );

    // Sort by bitrate descending
    audioFormats.sort((a, b) => (b.audioBitrate || 0) - (a.audioBitrate || 0));

    const format = audioFormats[0];

    if (!format || !format.url) {
      // Fallback: use first format that has a URL
      const fallback = formats.find((f) => f.url);
      if (!fallback) {
        return res.status(404).json({ message: "No usable format found" });
      }
      console.log(`[Stream] Using fallback format: ${fallback.mimeType}`);
      return proxyAudioUrl(fallback.url, fallback.mimeType, res, req, videoId);
    }

    console.log(`[Stream] Format: ${format.mimeType}, bitrate: ${format.audioBitrate}`);
    return proxyAudioUrl(format.url, format.mimeType, res, req, videoId);

  } catch (err) {
    console.error(`[Stream] Failed for ${videoId}:`, err.message);
    if (!res.headersSent) {
      res.status(500).json({ message: "Could not stream audio", error: err.message });
    }
  }
};

function proxyAudioUrl(audioUrl, mimeType, res, req, videoId) {
  // Determine content type
  let contentType = "audio/webm";
  if (mimeType) {
    if (mimeType.includes("mp4")) contentType = "audio/mp4";
    else if (mimeType.includes("webm")) contentType = "audio/webm";
    else if (mimeType.includes("mpeg")) contentType = "audio/mpeg";
  }

  res.setHeader("Content-Type", contentType);
  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Access-Control-Allow-Origin", "*");

  const lib = audioUrl.startsWith("https") ? https : http;
  const ytReq = lib.get(audioUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Referer": "https://www.youtube.com/",
      "Origin": "https://www.youtube.com",
    }
  }, (ytRes) => {
    // Pass through content-length if available
    if (ytRes.headers["content-length"]) {
      res.setHeader("Content-Length", ytRes.headers["content-length"]);
    }
    console.log(`[Stream] Proxying ${videoId}, status: ${ytRes.statusCode}`);
    ytRes.pipe(res);
  });

  ytReq.on("error", (err) => {
    console.error(`[Stream] Proxy error for ${videoId}:`, err.message);
    if (!res.headersSent) {
      res.status(500).json({ message: "Proxy error" });
    }
  });

  req.on("close", () => {
    console.log(`[Stream] Client closed for ${videoId}`);
    ytReq.destroy();
  });
}

module.exports = { streamAudio };
