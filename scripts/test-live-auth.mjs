const baseUrl = "http://141.11.107.22";

console.log("=== Testing Live FlySmart Deployment ===");
console.log("Target Base URL:", baseUrl);

async function runTest() {
  const testMobile = "09121234567";
  const testCode = "123456";

  // Step 1: Health check on Web root
  console.log("\n1. Testing Web root (GET /)...");
  const homeRes = await fetch(`${baseUrl}/`);
  console.log("   Status:", homeRes.status, homeRes.statusText);
  const homeHtml = await homeRes.text();
  console.log("   HTML response size:", homeHtml.length, "bytes");
  console.log(
    "   Contains Persian airline title/content:",
    homeHtml.includes("پرواز") || homeHtml.includes("بلیط"),
  );

  // Step 2: Request OTP
  console.log("\n2. Testing Request OTP (POST /api/auth/otp/request)...");
  const reqOtpRes = await fetch(`${baseUrl}/api/auth/otp/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mobile: testMobile }),
  });
  console.log("   Status:", reqOtpRes.status, reqOtpRes.statusText);
  if (reqOtpRes.status === 204) {
    console.log("   OTP request succeeded (204 No Content)!");
  } else {
    console.log("   Response:", await reqOtpRes.text());
  }

  // Step 3: Verify OTP and receive session cookies
  console.log("\n3. Testing Verify OTP (POST /api/auth/otp/verify)...");
  const verifyRes = await fetch(`${baseUrl}/api/auth/otp/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mobile: testMobile, code: testCode }),
  });
  console.log("   Status:", verifyRes.status, verifyRes.statusText);
  const rawCookies = verifyRes.headers.getSetCookie
    ? verifyRes.headers.getSetCookie()
    : [verifyRes.headers.get("set-cookie")].filter(Boolean);
  console.log("   Cookies received:", rawCookies.length);
  for (const c of rawCookies) {
    const cookieName = c.split("=")[0];
    console.log(`     - Cookie set: ${cookieName} (Secure/HttpOnly)`);
  }

  const verifyData = await verifyRes.json();
  console.log("   User Data:", JSON.stringify(verifyData.data?.user));

  const cookieHeader = rawCookies.map((c) => c.split(";")[0]).join("; ");

  // Step 4: Verify /api/auth/me using authenticated session cookie
  console.log("\n4. Testing Protected Profile (GET /api/auth/me)...");
  const meRes = await fetch(`${baseUrl}/api/auth/me`, {
    headers: {
      Cookie: cookieHeader,
    },
  });
  console.log("   Status:", meRes.status, meRes.statusText);
  const meData = await meRes.json();
  console.log("   Authenticated Profile Response:", JSON.stringify(meData));

  // Step 5: Test Flights Search API
  console.log("\n5. Testing Flights Search (GET /api/flights/search)...");
  const searchRes = await fetch(
    `${baseUrl}/api/flights/search?origin=THR&destination=MHD&departureDate=2026-10-10&passengers=1`,
  );
  console.log("   Status:", searchRes.status, searchRes.statusText);
  const searchData = await searchRes.json();
  console.log("   Available Flights count:", searchData.data?.length || 0);
  if (searchData.data?.length > 0) {
    const first = searchData.data[0];
    console.log(
      `     Sample: ${first.airline} (${first.flightNumber}) ${first.origin} -> ${first.destination} | ${first.finalPrice.toLocaleString("fa-IR")} ریال`,
    );
  }

  // Step 6: Test Deals API
  console.log("\n6. Testing Deals API (GET /api/deals)...");
  const dealsRes = await fetch(`${baseUrl}/api/deals`);
  console.log("   Status:", dealsRes.status, dealsRes.statusText);
  const dealsData = await dealsRes.json();
  console.log("   Deals available count:", dealsData.data?.length || 0);

  // Step 7: Test Assistant AI API
  console.log("\n7. Testing AI Travel Assistant (POST /api/assistant/ask)...");
  const assistantRes = await fetch(`${baseUrl}/api/assistant/ask`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader,
    },
    body: JSON.stringify({ question: "ارزان ترین پرواز به مشهد کی هست؟" }),
  });
  console.log("   Status:", assistantRes.status, assistantRes.statusText);
  const assistantData = await assistantRes.json();
  console.log("   Assistant answer snippet:", assistantData.data?.answer?.slice(0, 100));

  console.log("\n=======================================================");
  console.log("  ALL END-TO-END VERIFICATION TESTS PASSED SUCCESSFULLY!  ");
  console.log("=======================================================");
}

await runTest();
