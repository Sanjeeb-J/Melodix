const youtubeDl = require("youtube-dl-exec");
const https = require("https");

const streamAudio = async (req, res) => {
  const { videoId } = req.params;

  if (!videoId) {
    return res.status(400).json({ message: "videoId is required" });
  }

  const url = `https://www.youtube.com/watch?v=${videoId}`;
  console.log(`[Stream] Request for videoId: ${videoId}`);

  try {
    // Get the direct audio URL (fast, JSON output)
    const info = await youtubeDl(url, {
      format: "bestaudio[ext=webm]/bestaudio[ext=m4a]/bestaudio",
      getUrl: true,
      noPlaylist: true,
      quiet: true,
    });

    // youtube-dl-exec returns a string with the URL (possibly multi-line)
    const audioUrl = (typeof info === "string" ? info : JSON.stringify(info))
      .trim()
      .split("\n")[0];

    if (!audioUrl || !audioUrl.startsWith("http")) {
      console.error(`[Stream] No URL for ${videoId}:`, info);
      return res.status(500).json({ message: "Could not get audio URL" });
    }

    console.log(`[Stream] Got audio URL for ${videoId}. Proxying...`);

    // Set streaming headers
    res.setHeader("Content-Type", "audio/webm");
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Cache-Control", "no-cache");

    // Proxy the audio stream to the client
    const ytReq = https.get(audioUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://www.youtube.com/",
      },
    }, (ytRes) => {
      if (ytRes.headers["content-type"]) {
        res.setHeader("Content-Type", ytRes.headers["content-type"]);
      }
      if (ytRes.headers["content-length"]) {
        res.setHeader("Content-Length", ytRes.headers["content-length"]);
      }

      console.log(`[Stream] Proxying ${videoId} - HTTP ${ytRes.statusCode}`);
      ytRes.pipe(res);

      ytRes.on("end", () => {
        console.log(`[Stream] Done: ${videoId}`);
      });
    });

    ytReq.on("error", (err) => {
      console.error(`[Stream] Proxy error for ${videoId}:`, err.message);
      if (!res.headersSent) {
        res.status(500).json({ message: "Proxy stream error" });
      }
    });

    req.on("close", () => {
      console.log(`[Stream] Client closed for ${videoId}`);
      ytReq.destroy();
    });

  } catch (err) {
    console.error(`[Stream] Error for ${videoId}:`, err.stderr || err.message);
    if (!res.headersSent) {
      res.status(500).json({ message: "Stream failed", error: (err.stderr || err.message)?.substring(0, 200) });
    }
  }
};

module.exports = { streamAudio };
