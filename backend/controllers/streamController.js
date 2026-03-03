const ffmpeg = require("fluent-ffmpeg");
const ffmpegStatic = require("ffmpeg-static");
const ytdl = require("@distube/ytdl-core");

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegStatic);

// ─── Controller ─────────────────────────────────────────────────────────────
const streamAudio = async (req, res) => {
  const { videoId } = req.params;
  if (!videoId) return res.status(400).json({ message: "videoId is required" });

  try {
    console.log(`[Stream] Proxying and transcoding audio for ${videoId}...`);
    
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    
    // ytdl-core automatically handles deciphering, client spoofing, and format selection
    const audioStream = ytdl(url, {
      filter: "audioonly",
      quality: "highestaudio",
    });

    audioStream.on('error', (err) => {
      console.error(`[ytdl-core] Stream error for ${videoId}:`, err.message);
      if (!res.headersSent) {
         res.status(500).json({ message: "Error opening video stream", error: err.message });
      }
    });

    res.writeHead(200, {
      "Content-Type": "audio/mpeg", // Send actual MP3 header
      "Cache-Control": "no-cache",
      "Transfer-Encoding": "chunked", // Required for continuous streaming
    });

    // We transcode to MP3 on the fly so the browser <audio> tag never throws a format error
    const command = ffmpeg(audioStream)
      .format("mp3")
      .audioCodec("libmp3lame")
      .on("error", (err) => {
        // Suppress "Output stream closed" errors on client disconnect
        if (!err.message.includes("Output stream closed")) {
          console.error(`[FFmpeg] Error transcoding ${videoId}:`, err.message);
        }
      })
      .on("end", () => {
        console.log(`[Stream] Finished streaming ${videoId}`);
      });

    // Pipe the transcoded MP3 stream directly to the response
    command.pipe(res, { end: true });

    req.on("close", () => {
      console.log(`[Stream] Client disconnected for ${videoId}`);
      try {
        command.kill("SIGKILL"); // Kill FFmpeg process if client disconnects early
      } catch (e) {}
      audioStream.destroy();
    });

  } catch (err) {
    console.error(`[Stream] Error for ${videoId}:`, err.message);
    if (!res.headersSent) {
      res.status(500).json({ message: "Failed to stream audio", error: err.message });
    }
  }
};

module.exports = { streamAudio };

