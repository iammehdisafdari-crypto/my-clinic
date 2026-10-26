process.env.NODE_ENV = "test";

import { verifyOrigin } from "../src/lib/security";
import { POST as changePasswordPost } from "../src/app/api/auth/change-password/route";
import { POST as registerPost } from "../src/app/api/auth/register/route";
import { POST as logoutPost } from "../src/app/api/auth/logout/route";
import { POST as loginPost } from "../src/app/api/auth/login/route";
import { NextRequest } from "next/server";

const pass = (msg: string) => console.log(`\x1b[32mâœ” PASS:\x1b[0m ${msg}`);
const fail = (msg: string) => {
  console.error(`\x1b[31mâœ– FAIL:\x1b[0m ${msg}`);
  process.exitCode = 1;
};

let testsRun = 0;
let testsPassed = 0;

function assert(condition: boolean, msg: string) {
  testsRun++;
  if (condition) {
    testsPassed++;
    pass(msg);
  } else {
    fail(msg);
  }
}

async function runRemediationTests() {
  console.log("\n=======================================================");
  console.log("   RUNNING TARGETED REMEDIATION TEST SUITE             ");
  console.log("=======================================================");

  const TARGET_URL = "http://127.0.0.1:8799/api/users";

  // --- PART 1: ORIGIN & CSRF VALIDATION ---
  console.log("\n--- 1. Testing Strict Origin & CSRF Validation ---");
  {
    // 1.1 Safe GET request
    const getReq = new Request(TARGET_URL, {
      method: "GET",
      headers: { Origin: "https://external-reader.com" },
    });
    assert(verifyOrigin(getReq).ok === true, "GET requests bypass origin mutation check");

    // 1.2 Valid same-origin POST request
    const sameOriginReq = new Request(TARGET_URL, {
      method: "POST",
      headers: {
        Host: "127.0.0.1:8799",
        Origin: "http://127.0.0.1:8799",
        "Sec-Fetch-Site": "same-origin",
      },
    });
    assert(verifyOrigin(sameOriginReq).ok === true, "Valid same-origin POST request is accepted");

    // 1.3 Cross-origin POST request (different Origin)
    const crossOriginReq = new Request(TARGET_URL, {
      method: "POST",
      headers: {
        Host: "127.0.0.1:8799",
        Origin: "https://evil-attacker.com",
      },
    });
    const crossRes = verifyOrigin(crossOriginReq);
    assert(crossRes.ok === false && crossRes.errorResponse?.status === 403, "Cross-origin POST request is rejected with 403 Forbidden");

    // 1.4 Scheme mismatch (https vs http)
    const schemeMismatchReq = new Request(TARGET_URL, {
      method: "POST",
      headers: {
        Host: "127.0.0.1:8799",
        Origin: "https://127.0.0.1:8799",
      },
    });
    assert(verifyOrigin(schemeMismatchReq).ok === false, "Scheme mismatch (https vs http) is strictly rejected with 403 Forbidden");

    // 1.5 Port mismatch (8800 vs 8799)
    const portMismatchReq = new Request(TARGET_URL, {
      method: "POST",
      headers: {
        Host: "127.0.0.1:8799",
        Origin: "http://127.0.0.1:8800",
      },
    });
    assert(verifyOrigin(portMismatchReq).ok === false, "Port mismatch is strictly rejected with 403 Forbidden");

    // 1.6 Similar hostname (attacker prefix/suffix)
    const similarHostReq = new Request(TARGET_URL, {
      method: "POST",
      headers: {
        Host: "127.0.0.1:8799",
        Origin: "http://127.0.0.1.attacker.com",
      },
    });
    assert(verifyOrigin(similarHostReq).ok === false, "Similar hostname prefix/suffix is strictly rejected with 403 Forbidden");

    // 1.7 Spoofed proxy header (x-forwarded-host)
    const spoofedProxyReq = new Request(TARGET_URL, {
      method: "POST",
      headers: {
        Host: "127.0.0.1:8799",
        "x-forwarded-host": "attacker.com",
        Origin: "http://attacker.com",
      },
    });
    assert(verifyOrigin(spoofedProxyReq).ok === false, "Spoofed x-forwarded-host header cannot poison target origin (rejected with 403)");

    // 1.8 Sec-Fetch-Site cross-site
    const secFetchCrossReq = new Request(TARGET_URL, {
      method: "POST",
      headers: {
        Host: "127.0.0.1:8799",
        Origin: "http://127.0.0.1:8799",
        "Sec-Fetch-Site": "cross-site",
      },
    });
    const secFetchCrossRes = verifyOrigin(secFetchCrossReq);
    assert(secFetchCrossRes.ok === false && secFetchCrossRes.errorResponse?.status === 403, "Sec-Fetch-Site: cross-site is rejected with 403 Forbidden");

    // 1.9 Null origin
    const nullOriginReq = new Request(TARGET_URL, {
      method: "POST",
      headers: {
        Host: "127.0.0.1:8799",
        Origin: "null",
      },
    });
    assert(verifyOrigin(nullOriginReq).ok === false, "Origin: 'null' is rejected with 403 Forbidden");

    // 1.10 Malformed origin
    const badOriginReq = new Request(TARGET_URL, {
      method: "POST",
      headers: {
        Host: "127.0.0.1:8799",
        Origin: "not a valid url",
      },
    });
    assert(verifyOrigin(badOriginReq).ok === false, "Malformed Origin header is rejected with 403 Forbidden");

    // 1.11 Missing Origin, but valid same-origin Referer
    const validRefererReq = new Request(TARGET_URL, {
      method: "POST",
      headers: {
        Host: "127.0.0.1:8799",
        Referer: "http://127.0.0.1:8799/dashboard/users",
        Cookie: "auth_token=some_token",
      },
    });
    assert(verifyOrigin(validRefererReq).ok === true, "Missing Origin with valid same-origin Referer is accepted");

    // 1.12 Missing Origin with cross-origin Referer
    const badRefererReq = new Request(TARGET_URL, {
      method: "POST",
      headers: {
        Host: "127.0.0.1:8799",
        Referer: "https://attacker.com/malicious-page",
        Cookie: "auth_token=some_token",
      },
    });
    assert(verifyOrigin(badRefererReq).ok === false, "Missing Origin with cross-origin Referer is rejected with 403 Forbidden");

    // 1.13 Missing Origin AND missing Referer on authenticated mutating request
    const noOriginNoRefererReq = new Request(TARGET_URL, {
      method: "POST",
      headers: {
        Host: "127.0.0.1:8799",
        Cookie: "auth_token=some_token",
      },
    });
    const noOriginRes = verifyOrigin(noOriginNoRefererReq);
    assert(
      noOriginRes.ok === false && noOriginRes.errorResponse?.status === 403,
      "Authenticated mutating request lacking both Origin and Referer is rejected with 403 Forbidden"
    );
  }

  // --- PART 2: AUTH & LOGOUT ORIGIN CHECKS ---
  console.log("\n--- 2. Testing Auth Endpoints Origin Protection ---");
  {
    // Cross-origin Logout
    const crossLogoutReq = new Request("http://127.0.0.1:8799/api/auth/logout", {
      method: "POST",
      headers: {
        Host: "127.0.0.1:8799",
        Origin: "https://attacker.com",
        Cookie: "auth_token=session_jwt",
      },
    });
    const logoutRes = await logoutPost(crossLogoutReq);
    assert(logoutRes.status === 403, "Cross-origin POST /api/auth/logout returns 403 Forbidden");

    // Cross-origin Login
    const crossLoginReq = new Request("http://127.0.0.1:8799/api/auth/login", {
      method: "POST",
      headers: {
        Host: "127.0.0.1:8799",
        Origin: "https://attacker.com",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username: "admin", password: "password123" }),
    });
    const loginRes = await loginPost(crossLoginReq);
    assert(loginRes.status === 403, "Cross-origin POST /api/auth/login returns 403 Forbidden");
  }

  // --- PART 3: MASKING INTERNAL ERRORS ---
  console.log("\n--- 3. Testing Internal Error Masking ---");
  {
    (globalThis as any).DB = {
      prepare: () => {
        throw new Error("D1_INTERNAL_SQLITE_FAILURE: table locked at C:\\sqlite3.c:14023");
      },
    };
    (globalThis as any).__TEST_SESSION__ = { id: 1, uid: 1, name: "Admin", role: "manager", username: "admin" };

    const cpReq = new NextRequest("http://127.0.0.1:8799/api/auth/change-password", {
      method: "POST",
      headers: {
        Host: "127.0.0.1:8799",
        Origin: "http://127.0.0.1:8799",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ current_password: "oldPassword123", new_password: "newPassword123" }),
    });

    const cpRes = await changePasswordPost(cpReq);
    const cpData = await cpRes.json();

    assert(cpRes.status === 500, "DB failure in change-password returns 500 Internal Server Error");
    assert(typeof cpData.error === "string" && cpData.error.length > 0 && !cpData.error.includes("D1_"), "Error message is masked to generic text");
    assert(
      !JSON.stringify(cpData).includes("D1_INTERNAL_SQLITE_FAILURE") && !JSON.stringify(cpData).includes("sqlite3.c"),
      "Internal stack/SQL details are completely excluded from change-password response"
    );

    const cpShortPwReq = new NextRequest("http://127.0.0.1:8799/api/auth/change-password", {
      method: "POST",
      headers: {
        Host: "127.0.0.1:8799",
        Origin: "http://127.0.0.1:8799",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ current_password: "oldPassword123", new_password: "short" }),
    });
    const cpShortRes = await changePasswordPost(cpShortPwReq);
    assert(cpShortRes.status === 400, "Password length < 8 in change-password returns 400 Bad Request (not 500)");

    (globalThis as any).DB = {
      prepare: () => {
        throw new Error("SQLITE_CONSTRAINT_RAW: internal trigger abort on table users");
      },
    };

    const regReq = new Request("http://127.0.0.1:8799/api/auth/register", {
      method: "POST",
      headers: {
        Host: "127.0.0.1:8799",
        Origin: "http://127.0.0.1:8799",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: "test@example.com", password: "password123", username: "newuser" }),
    });

    const regRes = await registerPost(regReq);
    const regData = await regRes.json();

    assert(regRes.status === 500, "DB failure in register returns 500 Internal Server Error");
    assert(typeof regData.error === "string" && regData.error.length > 0 && !regData.error.includes("SQLITE_"), "Error message in register is masked to generic text");
    assert(
      !JSON.stringify(regData).includes("SQLITE_CONSTRAINT_RAW") && !JSON.stringify(regData).includes("internal trigger"),
      "Internal stack/SQL details are completely excluded from register response"
    );
  }

  console.log("\n=======================================================");
  console.log(`   REMEDIATION TESTS SUMMARY: ${testsPassed} / ${testsRun} PASSED `);
  console.log("=======================================================\n");

  if (testsPassed !== testsRun) {
    process.exit(1);
  }
}

runRemediationTests().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
