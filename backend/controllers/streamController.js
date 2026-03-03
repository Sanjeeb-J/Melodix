const { spawn } = require("child_process");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegStatic = require("ffmpeg-static");
const https = require("https");
const http = require("http");

// Use system ffmpeg if available (Docker has it installed), else ffmpeg-static
const ffmpegPath = process.env.FFMPEG_PATH || ffmpegStatic;
ffmpeg.setFfmpegPath(ffmpegPath);

// ─── yt-dlp spawn helper ──────────────────────────────────────────────────────
// On Docker/Linux: yt-dlp is at /usr/local/bin/yt-dlp  → set YTDLP_PATH env var
// On Windows dev:  yt-dlp runs via  python -m yt_dlp   → automatic fallback
function spawnYtDlp(args) {
  const ytdlpPath = process.env.YTDLP_PATH;

  if (ytdlpPath) {
    // Docker / Linux: direct binary
    return spawn(ytdlpPath, args);
  } else {
    // Windows dev fallback: python -m yt_dlp
    return spawn("python", ["-m", "yt_dlp", ...args]);
  }
}

// ─── Get direct CDN audio URL from YouTube ───────────────────────────────────
function getAudioUrl(videoId) {
  return new Promise((resolve, reject) => {
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    const args = [
      "--get-url",
      "-f", "bestaudio[ext=webm]/bestaudio[ext=m4a]/bestaudio/best",
      "--no-playlist",
      "--no-warnings",
      "--quiet",
      url,
    ];

    const proc = spawnYtDlp(args);
    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (d) => (stdout += d.toString()));
    proc.stderr.on("data", (d) => (stderr += d.toString()));

    proc.on("close", (code) => {
      const streamUrl = stdout.trim().split("\n")[0];
      if (code === 0 && streamUrl) {
        resolve(streamUrl);
      } else {
        reject(new Error(stderr.trim() || `yt-dlp exited with code ${code}`));
      }
    });

    proc.on("error", (err) =>
      reject(new Error(`Failed to spawn yt-dlp: ${err.message}`))
    );
  });
}

// ─── Stream Controller ────────────────────────────────────────────────────────
const streamAudio = async (req, res) => {
  const { videoId } = req.params;
  if (!videoId) return res.status(400).json({ message: "videoId is required" });

  try {
    console.log(`[Stream] Resolving audio URL via yt-dlp for ${videoId}...`);
    const audioUrl = await getAudioUrl(videoId);
    console.log(`[Stream] Got CDN URL, piping through ffmpeg → MP3...`);

    res.writeHead(200, {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-cache",
      "Transfer-Encoding": "chunked",
    });

    const protocol = audioUrl.startsWith("https") ? https : http;

    const cdnReq = protocol.get(
      audioUrl,
      { headers: { "User-Agent": "Mozilla/5.0" } },
      (audioStream) => {
        if (audioStream.statusCode >= 400) {
          console.error(`[Stream] CDN returned ${audioStream.statusCode} for ${videoId}`);
          if (!res.headersSent) res.status(502).end();
          return;
        }

        const command = ffmpeg(audioStream)
          .format("mp3")
          .audioCodec("libmp3lame")
          .audioBitrate(128)
          .on("error", (err) => {
            if (
              !err.message.includes("Output stream closed") &&
              !err.message.includes("SIGKILL")
            ) {
              console.error(`[FFmpeg] Transcode error for ${videoId}:`, err.message);
            }
          })
          .on("end", () => console.log(`[Stream] Finished ${videoId}`));

        command.pipe(res, { end: true });

        req.on("close", () => {
          console.log(`[Stream] Client disconnected for ${videoId}`);
          try { command.kill("SIGKILL"); } catch (_) {}
          audioStream.destroy();
          cdnReq.destroy();
        });
      }
    );

    cdnReq.on("error", (err) => {
      console.error(`[Stream] CDN fetch error for ${videoId}:`, err.message);
      if (!res.headersSent) res.status(502).json({ message: "Failed to fetch audio" });
    });

  } catch (err) {
    console.error(`[Stream] Error for ${videoId}:`, err.message);
    if (!res.headersSent) {
      res.status(500).json({ message: "Failed to stream audio", error: err.message });
    }
  }
};

module.exports = { streamAudio };
