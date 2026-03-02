const fetch = require("node-fetch");
const fs = require("fs");

async function test() {
  const email = `testplay_${Date.now()}@test.com`;

  console.log("Step 1: Registering new user...");
  await fetch("https://melodix-production.up.railway.app/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Test", email, password: "test123" })
  });

  console.log("Step 2: Logging in...");
  const loginRes = await fetch("https://melodix-production.up.railway.app/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "test123" })
  });
  const { token } = await loginRes.json();
  console.log("Got token:", token ? "YES" : "NO");

  if (!token) return console.error("Login failed");

  // Test a known YouTube video: "Rick Astley - Never Gonna Give You Up"
  const videoId = "dQw4w9WgXcQ";
  const streamUrl = `https://melodix-production.up.railway.app/api/stream/${videoId}?token=${token}`;
  
  console.log("Step 3: Hitting stream endpoint...");
  console.log("URL:", streamUrl);
  
  try {
    const streamRes = await fetch(streamUrl);
    console.log("Stream response status:", streamRes.status);
    console.log("Content-Type:", streamRes.headers.get("content-type"));
    
    if (!streamRes.ok) {
      const text = await streamRes.text();
      console.error("Stream error body:", text);
    } else {
      // Read a small chunk to confirm data flows
      const reader = streamRes.body;
      let bytes = 0;
      for await (const chunk of reader) {
        bytes += chunk.length;
        if (bytes > 50000) break; // 50KB is enough to confirm it works
      }
      console.log(`SUCCESS! Received ${bytes} bytes of audio data.`);
    }
  } catch (err) {
    console.error("Fetch error:", err.message);
  }
}

test().catch(console.error);
