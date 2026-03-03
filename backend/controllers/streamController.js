const { Innertube } = require("youtubei.js");
const https = require("https");
const http = require("http");

let innertube = null;

const getInnertube = async () => {
  if (!innertube) {
    innertube = await Innertube.create({
      cache: undefined,
      generate_session_locally: true,
    });
  }
  return innertube;
};

const streamAudio = async (req, res) => {
  const { videoId } = req.params;

  if (!videoId) {
    return res.status(400).json({ message: "videoId is required" });
  }

  console.log(`[Stream] Request for videoId: ${videoId}`);

  try {
    const yt = await getInnertube();
    const info = await yt.getBasicInfo(videoId);

    // Choose the best audio-only format
    const audioFormats = info.streaming_data?.adaptive_formats?.filter(
      (f) => f.has_audio && !f.has_video
    );

    if (!audioFormats || audioFormats.length === 0) {
      console.error(`[Stream] No audio formats for ${videoId}`);
      return res.status(500).json({ message: "No audio formats available" });
    }

    // Sort by bitrate descending, pick the best one
    audioFormats.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
    const bestAudio = audioFormats[0];

    const audioUrl = bestAudio.decipher(yt.session.player);

    if (!audioUrl) {
      console.error(`[Stream] Could not decipher URL for ${videoId}`);
      return res.status(500).json({ message: "Could not get audio URL" });
    }

    console.log(
      `[Stream] Got audio URL for ${videoId} (${bestAudio.mime_type}, ${bestAudio.bitrate}bps). Proxying...`
    );

    // Set streaming headers
    const contentType = bestAudio.mime_type || "audio/webm";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Cache-Control", "no-cache");

    // Determine http or https
    const transport = audioUrl.startsWith("https") ? https : http;

    // Proxy the audio stream to the client
    const ytReq = transport.get(
      audioUrl,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Referer: "https://www.youtube.com/",
        },
      },
      (ytRes) => {
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
      }
    );

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
    console.error(
      `[Stream] Error for ${videoId}:`,
      err.message || err
    );
    // Reset innertube instance on error so next request creates fresh one
    innertube = null;
    if (!res.headersSent) {
      res.status(500).json({
        message: "Stream failed",
        error: (err.message || String(err)).substring(0, 200),
      });
    }
  }
};

module.exports = { streamAudio };
