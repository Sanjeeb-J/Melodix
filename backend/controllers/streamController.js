const YTDlpWrap = require("yt-dlp-wrap").default;
const path = require("path");
const fs = require("fs");

// Initialize yt-dlp - will auto-download binary if not present
let ytDlp;

const getYtDlp = async () => {
  if (!ytDlp) {
    const binaryDir = path.join(__dirname, "..", "bin");
    if (!fs.existsSync(binaryDir)) {
      fs.mkdirSync(binaryDir, { recursive: true });
    }
    const binaryPath = path.join(
      binaryDir,
      process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp"
    );

    if (!fs.existsSync(binaryPath)) {
      console.log("Downloading yt-dlp binary...");
      await YTDlpWrap.downloadFromGithub(binaryPath);
      console.log("yt-dlp binary downloaded.");
    }

    ytDlp = new YTDlpWrap(binaryPath);
  }
  return ytDlp;
};

const streamAudio = async (req, res) => {
  const { videoId } = req.params;

  if (!videoId) {
    return res.status(400).json({ message: "videoId is required" });
  }

  const url = `https://www.youtube.com/watch?v=${videoId}`;
  console.log(`[Streaming] Request for videoId: ${videoId}`);

  try {
    const yt = await getYtDlp();

    // Use a more standard audio MIME type
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Improved flags for better streaming compatibility
    const stream = yt.execStream([
      url,
      "-f", "bestaudio/best",
      "--no-playlist",
      "--quiet",
      "--no-warnings",
      "-o", "-",
    ]);

    console.log(`[Streaming] Started yt-dlp process for ${videoId}`);

    stream.pipe(res);

    req.on("close", () => {
      console.log(`[Streaming] Client closed connection for ${videoId}`);
      if (stream.ytDlpProcess) stream.ytDlpProcess.kill();
      stream.destroy();
    });

    stream.on("error", (err) => {
      console.error(`[Streaming] yt-dlp stream error for ${videoId}:`, err.message);
      if (!res.headersSent) {
        res.status(500).send("Stream failed");
      }
    });

    stream.on("end", () => {
      console.log(`[Streaming] Finished streaming ${videoId}`);
    });
  } catch (err) {
    console.error(`[Streaming] Controller error for ${videoId}:`, err.message);
    if (!res.headersSent) {
      res.status(500).json({ message: "Could not start stream" });
    }
  }
};

module.exports = { streamAudio };
