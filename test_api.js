const fetch = require("node-fetch");

async function test() {
  const email = `test_${Date.now()}@test.com`;
  
  console.log("Registering...", email);
  await fetch("https://melodix-production.up.railway.app/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Test User", email, password: "test123" })
  });

  console.log("Logging in...");
  const loginRes = await fetch("https://melodix-production.up.railway.app/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "test123" })
  });
  
  const loginData = await loginRes.json();
  console.log("Login response:", loginRes.status, loginData);
  
  if (!loginData.token) return;
  
  console.log("Fetching playlists...");
  const plRes = await fetch("https://melodix-production.up.railway.app/api/playlists", {
    headers: { Authorization: `Bearer ${loginData.token}` }
  });
  
  const plData = await plRes.json();
  console.log("Playlists response:", plRes.status, plData);
}

test();
