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

  try {
    const yt = await getYtDlp();

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Transfer-Encoding", "chunked");
    res.setHeader("Accept-Ranges", "bytes");

    const stream = yt.execStream([
      url,
      "-f",
      "bestaudio[ext=webm]/bestaudio/best",
      "--no-playlist",
      "-o",
      "-",
      "--quiet",
    ]);

    stream.pipe(res);

    req.on("close", () => {
      stream.destroy();
    });

    stream.on("error", (err) => {
      console.error("yt-dlp stream error:", err.message);
      if (!res.headersSent) {
        res.status(500).json({ message: "Stream failed" });
      }
    });
  } catch (err) {
    console.error("Stream controller error:", err.message);
    if (!res.headersSent) {
      res.status(500).json({ message: "Could not start stream" });
    }
  }
};

module.exports = { streamAudio };
