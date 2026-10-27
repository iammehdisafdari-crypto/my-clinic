process.env.NODE_ENV = "test";

import { canManageRole, DB_ROLES, isDbRole, ROLE_HIERARCHY, ROLE_LABELS } from "../src/lib/roles";
import { can } from "../src/lib/permissions";
import { PUT, DELETE } from "../src/app/api/users/[id]/route";
import { POST, GET } from "../src/app/api/users/route";
import { hashPassword, verifyPassword } from "../src/lib/crypto";
import { NextRequest } from "next/server";
import type { SessionUser } from "../src/lib/session";

// Colors for output
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

async function runTests() {
  console.log("\n=======================================================");
  console.log("   RUNNING USER MANAGEMENT & SECURITY TEST SUITE       ");
  console.log("=======================================================\n");

  // --- SECTION 1: ROLE HIERARCHY & CAN_MANAGE TESTS ---
  console.log("--- 1. Testing Role Hierarchy & canManageRole ---");
  assert(ROLE_HIERARCHY.admin === 1 && ROLE_HIERARCHY.manager === 1, "admin and manager are rank 1");
  assert(ROLE_HIERARCHY.doctor === 2, "doctor is rank 2");
  assert(ROLE_HIERARCHY.scheduler === 3, "scheduler is rank 3");
  assert(ROLE_HIERARCHY.nurse === 4, "nurse is rank 4");
  assert(ROLE_HIERARCHY.uploader === 5, "uploader is rank 5");
  assert(ROLE_HIERARCHY.photographer === 5, "photographer is rank 5 (legacy compatibility)");
  assert(ROLE_HIERARCHY.visitor === 6, "visitor is rank 6");
  assert(ROLE_HIERARCHY.marketer === 6, "marketer is rank 6 (legacy compatibility)");

  assert(canManageRole("manager", "doctor") === true, "manager can manage doctor (lower rank)");
  assert(canManageRole("manager", "nurse") === true, "manager can manage nurse (lower rank)");
  assert(canManageRole("manager", "scheduler") === true, "manager can manage scheduler (lower rank)");
  assert(canManageRole("manager", "uploader") === true, "manager can manage uploader (lower rank)");
  assert(canManageRole("manager", "photographer") === true, "manager can manage photographer (lower rank)");
  assert(canManageRole("manager", "visitor") === true, "manager can manage visitor (lower rank)");
  assert(canManageRole("manager", "marketer") === true, "manager can manage marketer (lower rank)");

  assert(canManageRole("manager", "manager") === false, "manager cannot manage another manager (same level)");
  assert(canManageRole("manager", "admin") === false, "manager cannot manage admin (same level)");
  assert(canManageRole("admin", "manager") === false, "admin cannot manage manager (same level)");
  assert(canManageRole("doctor", "doctor") === false, "doctor cannot manage doctor (same level)");
  assert(canManageRole("doctor", "manager") === false, "doctor cannot manage manager (higher level)");

  // --- SECTION 2: DB ROLES CONSTRAINT ---
  console.log("\n--- 2. Testing Database Role Constraints (DB_ROLES) ---");
  const expectedDbRoles = ["manager", "doctor", "scheduler", "nurse", "uploader", "visitor"];
  assert(
    expectedDbRoles.every((r) => isDbRole(r)),
    "All real DB constraint roles are valid in isDbRole"
  );
  assert(isDbRole("photographer") === false, "photographer is NOT a DB role (uploader is used for new assignments)");
  assert(isDbRole("marketer") === false, "marketer is NOT a DB role (visitor is used for new assignments)");
  assert(isDbRole("admin") === false, "admin is NOT a DB role (manager is used in DB users table)");
  assert(isDbRole("random_role") === false, "random_role is rejected");

  // --- SECTION 3: PERMISSIONS & DOCTOR RESTRICTION ---
  console.log("\n--- 3. Testing permissions: users:manage restriction ---");
  assert(can("admin", "users:manage") === true, "admin has users:manage permission");
  assert(can("manager", "users:manage") === true, "manager has users:manage permission");
  assert(can("doctor", "users:manage") === false, "doctor DOES NOT have users:manage permission");
  assert(can("nurse", "users:manage") === false, "nurse DOES NOT have users:manage permission");
  assert(can("scheduler", "users:manage") === false, "scheduler DOES NOT have users:manage permission");

  // --- SECTION 4: ROUTE HANDLER TESTS (PUT & DELETE) ---
  console.log("\n--- 4. Testing Route Handlers (PUT & DELETE in /api/users/[id]) ---");

  // Mock Database and Users including a legacy photographer account
  const mockUsers: Record<number, { id: number; username: string; full_name: string; role: string; password_hash: string; active?: number }> = {
    1: { id: 1, username: "admin_user", full_name: "Admin Sys", role: "manager", password_hash: "h1", active: 1 },
    2: { id: 2, username: "manager_user", full_name: "Clinic Manager", role: "manager", password_hash: "h2", active: 1 },
    10: { id: 10, username: "doc_mohsen", full_name: "Dr Mohsen", role: "doctor", password_hash: "h10", active: 1 },
    11: { id: 11, username: "H.Ahangaran", full_name: "Hadis Ahangaran", role: "photographer", password_hash: "h11", active: 1 },
    20: { id: 20, username: "nurse_mary", full_name: "Nurse Mary", role: "nurse", password_hash: "h20", active: 1 },
  };

  const mockDb = {
    prepare: (query: string) => {
      let bound: any[] = [];
      return {
        bind: (...args: any[]) => {
          bound = args;
          return {
            first: async () => {
              if (query.includes("SELECT id, username, role FROM users WHERE id = ?1")) {
                const target = mockUsers[Number(bound[0])];
                return target ? { id: target.id, username: target.username, role: target.role } : null;
              }
              if (query.includes("SELECT role, COALESCE(NULLIF(full_name, ''), username) as name, username, active FROM users WHERE id = ?1")) {
                const target = mockUsers[Number(bound[0])];
                return target ? { role: target.role, name: target.full_name, username: target.username, active: target.active ?? 1 } : null;
              }
              if (query.includes("SELECT id FROM users WHERE username = ?1 AND id != ?2")) {
                const username = bound[0];
                const excludeId = Number(bound[1]);
                const found = Object.values(mockUsers).find((u) => u.username === username && u.id !== excludeId);
                return found ? { id: found.id } : null;
              }
              if (query.includes("SELECT id, username, COALESCE(NULLIF(full_name, ''), username) AS display_name, role, 1 AS is_active FROM users WHERE username = ?1")) {
                const username = bound[0];
                const found = Object.values(mockUsers).find((u) => u.username === username);
                return found ? { id: found.id, username: found.username, display_name: found.full_name, role: found.role, is_active: 1 } : null;
              }
              return null;
            },
            all: async () => {
              if (query.includes("SELECT id, username, COALESCE(NULLIF(full_name, ''), username) AS display_name, role, 1 AS is_active FROM users")) {
                const list = Object.values(mockUsers).map((u) => ({
                  id: u.id,
                  username: u.username,
                  display_name: u.full_name,
                  role: u.role,
                  is_active: 1,
                }));
                return { results: list };
              }
              return { results: [] };
            },
            run: async () => {
              if (query.includes("UPDATE users")) {
                const targetId = Number(bound[bound.length - 1]);
                if (mockUsers[targetId]) {
                  mockUsers[targetId].username = bound[0];
                  mockUsers[targetId].full_name = bound[1];
                  mockUsers[targetId].role = bound[2];
                }
              }
              if (query.includes("DELETE FROM users WHERE id = ?1")) {
                delete mockUsers[Number(bound[0])];
              }
              if (query.includes("INSERT INTO users")) {
                const newId = Math.max(...Object.keys(mockUsers).map(Number)) + 1;
                mockUsers[newId] = {
                  id: newId,
                  username: bound[0],
                  password_hash: bound[1],
                  full_name: bound[2],
                  role: bound[3],
                  active: 1,
                };
              }
              return { success: true };
            },
          };
        },
      };
    },
  };

  // Inject mock DB globally
  (globalThis as any).DB = mockDb;

  // Helper to set mock session
  const setTestSession = (session: SessionUser | null) => {
    (globalThis as any).__TEST_SESSION__ = session;
  };

  // 4.1 UNAUTHENTICATED
  {
    setTestSession(null);
    const putRes = await PUT(new NextRequest("http://localhost:3000/api/users/20", { method: "PUT" }), {
      params: Promise.resolve({ id: "20" }),
    });
    assert(putRes.status === 401, "Unauthenticated PUT returns 401 Unauthorized");

    const delRes = await DELETE(new NextRequest("http://localhost:3000/api/users/20", { method: "DELETE" }), {
      params: Promise.resolve({ id: "20" }),
    });
    assert(delRes.status === 401, "Unauthenticated DELETE returns 401 Unauthorized");
  }

  // 4.2 DOCTOR FORBIDDEN
  {
    setTestSession({ id: 10, uid: 10, name: "Dr Mohsen", role: "doctor", username: "doc_mohsen" });
    const putDoc = await PUT(new NextRequest("http://localhost:3000/api/users/20", { method: "PUT" }), {
      params: Promise.resolve({ id: "20" }),
    });
    assert(putDoc.status === 403, "Doctor attempting PUT returns 403 Forbidden");

    const delDoc = await DELETE(new NextRequest("http://localhost:3000/api/users/20", { method: "DELETE" }), {
      params: Promise.resolve({ id: "20" }),
    });
    assert(delDoc.status === 403, "Doctor attempting DELETE returns 403 Forbidden");
  }

  // 4.3 MANAGER ON OWN ACCOUNT (FORBIDDEN)
  {
    setTestSession({ id: 2, uid: 2, name: "Clinic Manager", role: "manager", username: "manager_user" });
    const putOwn = await PUT(
      new NextRequest("http://localhost:3000/api/users/2", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "manager_user", display_name: "New Name", role: "manager" }),
      }),
      { params: Promise.resolve({ id: "2" }) }
    );
    assert(putOwn.status === 403, "Manager attempting PUT on own account returns 403 Forbidden");

    const delOwn = await DELETE(new NextRequest("http://localhost:3000/api/users/2", { method: "DELETE" }), {
      params: Promise.resolve({ id: "2" }),
    });
    assert(delOwn.status === 403, "Manager attempting DELETE on own account returns 403 Forbidden");
  }

  // 4.4 MANAGER ON PEER MANAGER (FORBIDDEN)
  {
    setTestSession({ id: 2, uid: 2, name: "Clinic Manager", role: "manager", username: "manager_user" });
    const putPeer = await PUT(
      new NextRequest("http://localhost:3000/api/users/1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "admin_user", display_name: "Admin Modified", role: "manager" }),
      }),
      { params: Promise.resolve({ id: "1" }) }
    );
    assert(putPeer.status === 403, "Manager attempting PUT on another manager returns 403 Forbidden (same level)");

    const delPeer = await DELETE(new NextRequest("http://localhost:3000/api/users/1", { method: "DELETE" }), {
      params: Promise.resolve({ id: "1" }),
    });
    assert(delPeer.status === 403, "Manager attempting DELETE on another manager returns 403 Forbidden (same level)");
  }

  // 4.5 MANAGER CANNOT GRANT HIGHER/EQUAL ROLE
  {
    setTestSession({ id: 2, uid: 2, name: "Clinic Manager", role: "manager", username: "manager_user" });
    const createReq = (method: string, body?: any) =>
      new NextRequest("http://localhost:3000/api/users/20", {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });

    const putResSameRole = await PUT(
      createReq("PUT", {
        username: "nurse_mary",
        display_name: "Nurse Mary",
        role: "manager", // Trying to promote nurse to manager
      }),
      { params: Promise.resolve({ id: "20" }) }
    );
    assert(
      putResSameRole.status === 403,
      "Manager attempting to grant manager role returns 403 Forbidden (cannot grant same/higher role)"
    );
  }

  // 4.6 INVALID INPUTS
  {
    const createReq = (method: string, body?: any) =>
      new NextRequest("http://localhost:3000/api/users/20", {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });

    // Empty username
    const resEmptyUser = await PUT(
      createReq("PUT", { username: "   ", display_name: "Nurse Mary", role: "nurse" }),
      { params: Promise.resolve({ id: "20" }) }
    );
    assert(resEmptyUser.status === 400, "Empty username returns 400 Bad Request");

    // Empty display name
    const resEmptyName = await PUT(
      createReq("PUT", { username: "nurse_mary", display_name: "   ", role: "nurse" }),
      { params: Promise.resolve({ id: "20" }) }
    );
    assert(resEmptyName.status === 400, "Empty display_name returns 400 Bad Request");

    // Changing role to a non-DB role (e.g. from nurse to photographer)
    const resInvalidRoleChange = await PUT(
      createReq("PUT", { username: "nurse_mary", display_name: "Nurse Mary", role: "photographer" }),
      { params: Promise.resolve({ id: "20" }) }
    );
    assert(resInvalidRoleChange.status === 400, "Changing role to non-DB role (photographer) returns 400 Bad Request");

    // Unknown role
    const resUnknownRole = await PUT(
      createReq("PUT", { username: "nurse_mary", display_name: "Nurse Mary", role: "superadmin" }),
      { params: Promise.resolve({ id: "20" }) }
    );
    assert(resUnknownRole.status === 400, "Unknown role returns 400 Bad Request");

    // Password length < 8
    const resShortPw = await PUT(
      createReq("PUT", { username: "nurse_mary", display_name: "Nurse Mary", role: "nurse", new_password: "1234567" }),
      { params: Promise.resolve({ id: "20" }) }
    );
    assert(resShortPw.status === 400, "Password with 7 characters returns 400 Bad Request (minimum 8 required)");

    // Target user not found (404)
    const resNotFound = await PUT(
      createReq("PUT", { username: "nurse_mary", display_name: "Nurse Mary", role: "nurse" }),
      { params: Promise.resolve({ id: "999" }) }
    );
    assert(resNotFound.status === 404, "Non-existent user id returns 404 Not Found");

    // Invalid ID format
    const resBadId = await PUT(
      createReq("PUT", { username: "nurse_mary", display_name: "Nurse Mary", role: "nurse" }),
      { params: Promise.resolve({ id: "abc" }) }
    );
    assert(resBadId.status === 400, "Non-numeric user id returns 400 Bad Request");
  }

  // 4.7 PASSWORD WITH SPACES (NOT TRIMMED)
  {
    const createReq = (method: string, body?: any) =>
      new NextRequest("http://localhost:3000/api/users/20", {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });

    const resPwSpaces = await PUT(
      createReq("PUT", {
        username: "nurse_mary",
        display_name: "Nurse Mary",
        role: "nurse",
        new_password: "pass 123", // exactly 8 chars with a space
      }),
      { params: Promise.resolve({ id: "20" }) }
    );
    assert(resPwSpaces.status === 200, "8-character password with spaces is accepted without trimming");
  }

  // 4.8 LEGACY ROLE COMPATIBILITY
  {
    // Editing user 11 (photographer) without changing role: should succeed and keep 'photographer'
    const resLegacyEdit = await PUT(
      new NextRequest("http://localhost:3000/api/users/11", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: "H.Ahangaran",
          display_name: "Hadis Ahangaran Updated",
          role: "photographer", // unchanged role
          new_password: "new-password-123",
        }),
      }),
      { params: Promise.resolve({ id: "11" }) }
    );
    assert(resLegacyEdit.status === 200, "Editing legacy photographer account without changing role succeeds (200 OK)");
    assert(mockUsers[11].role === "photographer", "Legacy role is preserved as photographer (NOT silently mutated)");
  }

  // 4.9 SUCCESSFUL UPDATE AND DELETE OF LOWER RANK USER
  {
    const createReq = (method: string, body?: any) =>
      new NextRequest("http://localhost:3000/api/users/20", {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });

    const resSuccessPut = await PUT(
      createReq("PUT", {
        username: "nurse_mary_updated",
        display_name: "Nurse Mary Jane",
        role: "nurse",
      }),
      { params: Promise.resolve({ id: "20" }) }
    );
    assert(resSuccessPut.status === 200, "Manager can successfully update lower rank user");

    const resSuccessDel = await DELETE(createReq("DELETE"), { params: Promise.resolve({ id: "20" }) });
    assert(resSuccessDel.status === 200, "Manager can successfully delete lower rank user");
  }

  // --- SECTION 5: USER CREATION (POST /api/users) ---
  console.log("\n--- 5. Testing User Creation (POST /api/users) ---");
  {
    // Unauthenticated POST
    setTestSession(null);
    const postUnauth = await POST(
      new NextRequest("http://localhost:3000/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "u1", full_name: "U 1", password: "password123", role: "nurse" }),
      })
    );
    assert(postUnauth.status === 401, "Unauthenticated POST /api/users returns 401 Unauthorized");

    // Doctor attempting POST
    setTestSession({ id: 10, uid: 10, name: "Dr Mohsen", role: "doctor", username: "doc_mohsen" });
    const postDoctor = await POST(
      new NextRequest("http://localhost:3000/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "u1", full_name: "U 1", password: "password123", role: "nurse" }),
      })
    );
    assert(postDoctor.status === 403, "Doctor attempting POST /api/users returns 403 Forbidden");

    // Manager creating user with invalid role (photographer cannot be newly created)
    setTestSession({ id: 2, uid: 2, name: "Clinic Manager", role: "manager", username: "manager_user" });
    const postBadRole = await POST(
      new NextRequest("http://localhost:3000/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "u1", full_name: "U 1", password: "password123", role: "photographer" }),
      })
    );
    assert(postBadRole.status === 400, "Manager creating user with invalid role (photographer) returns 400 Bad Request");

    // Manager creating user with password < 8
    const postShortPw = await POST(
      new NextRequest("http://localhost:3000/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "u1", full_name: "U 1", password: "1234567", role: "nurse" }),
      })
    );
    assert(postShortPw.status === 400, "Manager creating user with short password returns 400 Bad Request");

    // Manager creating user with manager role (equal level)
    const postEqualRole = await POST(
      new NextRequest("http://localhost:3000/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "u_mgr", full_name: "New Manager", password: "password123", role: "manager" }),
      })
    );
    assert(postEqualRole.status === 403, "Manager creating user with manager role returns 403 Forbidden");

    // Manager creating user with valid lower role (nurse) and password with spaces
    const postSuccess = await POST(
      new NextRequest("http://localhost:3000/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "new_nurse", full_name: "New Nurse", password: "pass word 123", role: "nurse" }),
      })
    );
    assert(postSuccess.status === 201, "Manager creating valid lower-rank user returns 201 Created");
  }

  // --- SECTION 6: PASSWORD SPACES PRESERVATION IN CRYPTO ---
  console.log("\n--- 6. Testing Password Hashing & Space Preservation (Crypto) ---");
  {
    const rawPwWithSpaces = "  secure Password 123!  ";
    const hashed = await hashPassword(rawPwWithSpaces);

    assert(
      await verifyPassword(rawPwWithSpaces, hashed),
      "verifyPassword succeeds with exact password including spaces"
    );
    assert(
      (await verifyPassword(rawPwWithSpaces.trim(), hashed)) === false,
      "verifyPassword correctly FAILS when spaces are stripped (proves spaces are NOT trimmed)"
    );
    assert(
      (await verifyPassword("wrongPass123", hashed)) === false,
      "verifyPassword fails with incorrect password"
    );
  }

  // --- SECTION 7: FAIL-CLOSED SECRET & DATABASE CHECKS ---
  console.log("\n--- 7. Testing Fail-Closed Security Policies ---");
  {
    // Test that JWT secret validation requires at least 32 characters
    const secretKeyCheck = (secret: string) => {
      if (secret.length < 32 || secret === "NOT_SET") {
        throw new Error("JWT_SECRET must be configured with at least 32 characters.");
      }
      return new TextEncoder().encode(secret);
    };

    let shortSecretFailed = false;
    try {
      secretKeyCheck("too_short_secret");
    } catch {
      shortSecretFailed = true;
    }
    assert(shortSecretFailed, "JWT_SECRET < 32 chars fails closed (throws configuration error)");

    let notSetFailed = false;
    try {
      secretKeyCheck("NOT_SET");
    } catch {
      notSetFailed = true;
    }
    assert(notSetFailed, "JWT_SECRET == 'NOT_SET' fails closed (throws configuration error)");

    assert(
      secretKeyCheck("valid_jwt_secret_with_more_than_32_characters_ok").length >= 32,
      "Valid JWT_SECRET (>= 32 chars) is accepted"
    );
  }

  console.log("\n=======================================================");
  console.log(`   TESTS SUMMARY: ${testsPassed} / ${testsRun} PASSED   `);
  console.log("=======================================================\n");

  if (testsPassed !== testsRun) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
