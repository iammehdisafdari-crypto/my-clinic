import { SignJWT } from "jose";

const BASE_URL = "http://127.0.0.1:8799";
const JWT_SECRET = "clinic_test_super_secret_jwt_key_2026_32char";
const secretKey = new TextEncoder().encode(JWT_SECRET);

const pass = (msg: string) => console.log(`\x1b[32m✔ PASS:\x1b[0m ${msg}`);
const fail = (msg: string) => {
  console.error(`\x1b[31m✖ FAIL:\x1b[0m ${msg}`);
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

async function createToken(payload: { uid: number; role: string; name: string; username: string }, exp = "2h") {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(exp)
    .sign(secretKey);
}

const authHeaders = (token: string, extra: Record<string, string> = {}) => ({
  "Content-Type": "application/json",
  Origin: BASE_URL,
  Cookie: `auth_token=${token}`,
  ...extra,
});

async function runLiveHttpTests() {
  console.log("\n=======================================================");
  console.log("   RUNNING LIVE WORKER HTTP END-TO-END TEST SUITE     ");
  console.log("   Target: " + BASE_URL);
  console.log("=======================================================\n");

  // Create real JWT tokens for our seeded test users
  const doctorToken = await createToken({ uid: 10, role: "doctor", name: "Doctor User", username: "doctor_user" });
  const managerToken = await createToken({ uid: 2, role: "manager", name: "Manager User", username: "manager_user" });

  // 1. Unauthenticated Request (No Cookie)
  console.log("--- 1. Testing Unauthenticated Requests (No Cookie) ---");
  {
    const resPut = await fetch(`${BASE_URL}/api/users/1`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Origin: BASE_URL },
      body: JSON.stringify({ username: "nurse_user", display_name: "Nurse", role: "nurse" }),
    });
    assert(resPut.status === 401, `Unauthenticated PUT returns 401 Unauthorized (got ${resPut.status})`);

    const resDel = await fetch(`${BASE_URL}/api/users/1`, {
      method: "DELETE",
      headers: { Origin: BASE_URL },
    });
    assert(resDel.status === 401, `Unauthenticated DELETE returns 401 Unauthorized (got ${resDel.status})`);
  }

  // 2. Doctor Request (Forbidden)
  console.log("\n--- 2. Testing Doctor Requests (Must Be Forbidden) ---");
  {
    const resPut = await fetch(`${BASE_URL}/api/users/1`, {
      method: "PUT",
      headers: authHeaders(doctorToken),
      body: JSON.stringify({ username: "nurse_user", display_name: "Nurse", role: "nurse" }),
    });
    assert(resPut.status === 403, `Doctor PUT returns 403 Forbidden (got ${resPut.status})`);

    const resDel = await fetch(`${BASE_URL}/api/users/1`, {
      method: "DELETE",
      headers: authHeaders(doctorToken),
    });
    assert(resDel.status === 403, `Doctor DELETE returns 403 Forbidden (got ${resDel.status})`);
  }

  // 3. Manager - Own Account
  console.log("\n--- 3. Testing Manager on Own Account ---");
  {
    const resPutOwn = await fetch(`${BASE_URL}/api/users/2`, {
      method: "PUT",
      headers: authHeaders(managerToken),
      body: JSON.stringify({ username: "manager_new", display_name: "Manager", role: "nurse" }),
    });
    const dataPutOwn = await resPutOwn.json().catch(() => ({}));
    assert(
      resPutOwn.status === 403 && resPutOwn.status === 403,
      `Manager PUT on own account returns 403 Forbidden (got ${resPutOwn.status}: ${dataPutOwn.error})`
    );

    const resDelOwn = await fetch(`${BASE_URL}/api/users/2`, {
      method: "DELETE",
      headers: authHeaders(managerToken),
    });
    const dataDelOwn = await resDelOwn.json().catch(() => ({}));
    assert(
      resDelOwn.status === 403 && resDelOwn.status === 403,
      `Manager DELETE on own account returns 403 Forbidden (got ${resDelOwn.status}: ${dataDelOwn.error})`
    );
  }

  // 4. Manager - Peer User (Same Level)
  console.log("\n--- 4. Testing Manager on Peer User (Same Level) ---");
  {
    const resPutPeer = await fetch(`${BASE_URL}/api/users/1`, {
      method: "PUT",
      headers: authHeaders(managerToken),
      body: JSON.stringify({ username: "admin_mod", display_name: "Admin Mod", role: "nurse" }),
    });
    assert(resPutPeer.status === 403, `Manager PUT on peer manager returns 403 Forbidden (got ${resPutPeer.status})`);

    const resDelPeer = await fetch(`${BASE_URL}/api/users/1`, {
      method: "DELETE",
      headers: authHeaders(managerToken),
    });
    assert(resDelPeer.status === 403, `Manager DELETE on peer manager returns 403 Forbidden (got ${resDelPeer.status})`);
  }

  // 5. Setup Fresh Test Target User via POST /api/users
  console.log("\n--- 5. Creating Fresh Test User for Mutation Tests ---");
  const uniqueSuffix = Date.now().toString().slice(-5);
  const testUsername = `nurse_test_${uniqueSuffix}`;
  let targetUserId = 0;
  {
    const resCreate = await fetch(`${BASE_URL}/api/users`, {
      method: "POST",
      headers: authHeaders(managerToken),
      body: JSON.stringify({
        username: testUsername,
        full_name: "Live Test Nurse",
        role: "nurse",
        password: "initial_password_123",
      }),
    });
    const dataCreate = await resCreate.json().catch(() => ({}));
    assert(resCreate.status === 201 && dataCreate.user?.id, `Created fresh lower-rank user with ID ${dataCreate.user?.id}`);
    targetUserId = dataCreate.user.id;
  }

  // 6. Manager - Invalid Inputs on Live Target User
  console.log("\n--- 6. Testing Invalid Inputs ---");
  {
    const resEmptyUser = await fetch(`${BASE_URL}/api/users/${targetUserId}`, {
      method: "PUT",
      headers: authHeaders(managerToken),
      body: JSON.stringify({ username: "   ", display_name: "Nurse", role: "nurse" }),
    });
    assert(resEmptyUser.status === 400, `Empty username returns 400 Bad Request (got ${resEmptyUser.status})`);

    const resEmptyName = await fetch(`${BASE_URL}/api/users/${targetUserId}`, {
      method: "PUT",
      headers: authHeaders(managerToken),
      body: JSON.stringify({ username: testUsername, display_name: "   ", role: "nurse" }),
    });
    assert(resEmptyName.status === 400, `Empty display_name returns 400 Bad Request (got ${resEmptyName.status})`);

    const resShortPw = await fetch(`${BASE_URL}/api/users/${targetUserId}`, {
      method: "PUT",
      headers: authHeaders(managerToken),
      body: JSON.stringify({ username: testUsername, display_name: "Nurse", role: "nurse", new_password: "123" }),
    });
    assert(resShortPw.status === 400, `Password < 8 chars returns 400 Bad Request (got ${resShortPw.status})`);

    const resBadRole = await fetch(`${BASE_URL}/api/users/${targetUserId}`, {
      method: "PUT",
      headers: authHeaders(managerToken),
      body: JSON.stringify({ username: testUsername, display_name: "Nurse", role: "photographer" }),
    });
    assert(resBadRole.status === 400, `Disallowed role assignment returns 400 Bad Request (got ${resBadRole.status})`);
  }

  // 7. Token Invalidation, Deleted User & Expiry
  console.log("\n--- 7. Testing Token Invalidation, Deleted User & Expiry ---");
  {
    const ghostToken = await createToken({ uid: 99999, role: "manager", name: "Ghost User", username: "ghost" });
    const resGhost = await fetch(`${BASE_URL}/api/users/${targetUserId}`, {
      method: "PUT",
      headers: authHeaders(ghostToken),
      body: JSON.stringify({ username: testUsername, display_name: "Nurse", role: "nurse" }),
    });
    assert(resGhost.status === 401, `Deleted/non-existent user JWT returns 401 Unauthorized (got ${resGhost.status})`);

    const expiredToken = await new SignJWT({ uid: 2, role: "manager", name: "Manager User", username: "manager_user" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt(Math.floor(Date.now() / 1000) - 7200)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 3600)
      .sign(secretKey);

    const resExpired = await fetch(`${BASE_URL}/api/users/${targetUserId}`, {
      method: "PUT",
      headers: authHeaders(expiredToken),
      body: JSON.stringify({ username: testUsername, display_name: "Nurse", role: "nurse" }),
    });
    assert(resExpired.status === 401, `Expired JWT token returns 401 Unauthorized (got ${resExpired.status})`);

    const wrongKey = new TextEncoder().encode("wrong_secret_key_that_is_at_least_32_characters_long");
    const tamperedToken = await new SignJWT({ uid: 2, role: "manager", name: "Manager", username: "manager_user" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("2h")
      .sign(wrongKey);

    const resTampered = await fetch(`${BASE_URL}/api/users/${targetUserId}`, {
      method: "PUT",
      headers: authHeaders(tamperedToken),
      body: JSON.stringify({ username: testUsername, display_name: "Nurse", role: "nurse" }),
    });
    assert(resTampered.status === 401, `Tampered JWT signature returns 401 Unauthorized (got ${resTampered.status})`);
  }

  // 8. Manager - Authorized Valid Update on Lower Rank User (with spaces in password)
  console.log("\n--- 8. Testing Authorized Manager Update on Lower Rank User ---");
  {
    const resValidPut = await fetch(`${BASE_URL}/api/users/${targetUserId}`, {
      method: "PUT",
      headers: authHeaders(managerToken),
      body: JSON.stringify({
        username: testUsername,
        display_name: "Nurse Mary Jane",
        role: "nurse",
        new_password: "  pass 123  ", // 12 chars with leading & trailing spaces
      }),
    });
    const dataValidPut = await resValidPut.json().catch(() => ({}));
    assert(
      resValidPut.status === 200 && dataValidPut.success === true,
      `Authorized Manager PUT returns 200 OK (got ${resValidPut.status})`
    );
  }

  // 9. Re-login Test With Spaces In Password
  console.log("\n--- 9. Testing Login With Password Spaces ---");
  {
    const resLoginExact = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: BASE_URL },
      body: JSON.stringify({
        username: testUsername,
        password: "  pass 123  ",
      }),
    });
    const dataLoginExact = await resLoginExact.json().catch(() => ({}));
    assert(
      resLoginExact.status === 200 && dataLoginExact.success === true,
      `Login with exact spaces-preserved password succeeds (200 OK)`
    );

    const resLoginTrimmed = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: BASE_URL },
      body: JSON.stringify({
        username: testUsername,
        password: "pass 123",
      }),
    });
    assert(
      resLoginTrimmed.status === 401,
      `Login with trimmed password correctly FAILS (401 Unauthorized)`
    );
  }

  // 10. CSRF & Cross-Origin Request Defense Check
  console.log("\n--- 10. Testing Cross-Origin Request Blocking ---");
  {
    const resCrossOrigin = await fetch(`${BASE_URL}/api/users/${targetUserId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://malicious-cross-origin.com",
        Cookie: `auth_token=${managerToken}`,
      },
      body: JSON.stringify({
        username: testUsername,
        display_name: "Nurse Mary Jane",
        role: "nurse",
      }),
    });
    assert(
      resCrossOrigin.status === 403,
      `Cross-origin PUT request with foreign Origin is blocked with 403 Forbidden (got ${resCrossOrigin.status})`
    );

    const resSameOrigin = await fetch(`${BASE_URL}/api/users/${targetUserId}`, {
      method: "PUT",
      headers: authHeaders(managerToken),
      body: JSON.stringify({
        username: testUsername,
        display_name: "Nurse Mary Jane SameOrigin",
        role: "nurse",
      }),
    });
    assert(
      resSameOrigin.status === 200,
      `Same-origin PUT request with valid Origin is accepted with 200 OK (got ${resSameOrigin.status})`
    );
  }

  // 11. Manager - Authorized Valid Delete on Lower Rank User
  console.log("\n--- 11. Testing Authorized Manager Delete on Lower Rank User ---");
  {
    const resValidDel = await fetch(`${BASE_URL}/api/users/${targetUserId}`, {
      method: "DELETE",
      headers: authHeaders(managerToken),
    });
    const dataValidDel = await resValidDel.json().catch(() => ({}));
    assert(
      resValidDel.status === 200 && dataValidDel.success === true,
      `Authorized Manager DELETE returns 200 OK (got ${resValidDel.status})`
    );

    const resDelAgain = await fetch(`${BASE_URL}/api/users/${targetUserId}`, {
      method: "DELETE",
      headers: authHeaders(managerToken),
    });
    assert(resDelAgain.status === 404, `Deleted user returns 404 Not Found on subsequent requests`);
  }

  console.log("\n=======================================================");
  console.log(`   LIVE HTTP TESTS SUMMARY: ${testsPassed} / ${testsRun} PASSED `);
  console.log("=======================================================\n");

  if (testsPassed !== testsRun) {
    process.exit(1);
  }
}

runLiveHttpTests().catch((err) => {
  console.error("Live test failed:", err);
  process.exit(1);
});
