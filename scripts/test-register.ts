import "dotenv/config";

async function main() {
  const base = process.env.TEST_BASE_URL ?? "http://localhost:3000";
  const res = await fetch(`${base}/api/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Test User",
      email: `test${Date.now()}@example.com`,
      password: "TestPass123!",
    }),
  });
  const text = await res.text();
  console.log("Status:", res.status);
  console.log("Body:", text);
}

main().catch(console.error);
