// ======================================================
// HealthLink Automated Tests
// ======================================================

const BASE_URL = "http://localhost:5000";

let passed = 0;
let failed = 0;

// ------------------------------------------------------
// Helper functions
// ------------------------------------------------------

function pass(testName) {
  passed++;
  console.log(`PASS - ${testName}`);
}

function fail(testName, message = "") {
  failed++;
  console.log(`FAIL - ${testName}`);

  if (message) {
    console.log(`       ${message}`);
  }
}

async function post(endpoint, body) {
  const response = await fetch(BASE_URL + endpoint, {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
    },

    body: JSON.stringify(body),
  });

  let data;

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  return {
    response,
    data,
  };
}

// ======================================================
// TEST 1
// Oracle Get_Available_Units function
// ======================================================

async function testAvailableUnits() {
  const testName = "Oracle available units function";

  try {
    const { response, data } = await post("/api/available-units", {
      center_id: 1,
      blood_group: "B+",
    });

    if (response.ok && typeof data.available_units === "number") {
      pass(testName);
    } else {
      fail(testName, data.error || "Unexpected response");
    }
  } catch (error) {
    fail(testName, error.message);
  }
}

// ======================================================
// TEST 2
// Oracle package Can_Fullfill_Request function
// ======================================================

async function testRequestFulfillment() {
  const testName = "Oracle request fulfillment package";

  try {
    const { response, data } = await post("/api/check-request", {
      request_id: 5010,
    });

    if (response.ok && typeof data.can_fulfill === "boolean") {
      pass(testName);
    } else {
      fail(testName, data.error || "Unexpected response");
    }
  } catch (error) {
    fail(testName, error.message);
  }
}

// ======================================================
// TEST 3
// Invalid Blood Unit
// Oracle CHECK constraint should reject it
// ======================================================

async function testInvalidBloodUnit() {
  const testName = "Invalid blood unit rejected";

  try {
    const { response, data } = await post("/api/add-blood-unit", {
      unit_id: 990003,
      center_id: 1,
      blood_group: "A+",

      // Invalid:
      // expiry date is before collection date
      collection_date: "2026-09-08",
      expiry_date: "2026-09-01",

      status: "Available",
    });

    if (!response.ok && data.error) {
      pass(testName);
    } else {
      fail(testName, "Oracle accepted invalid dates");
    }
  } catch (error) {
    fail(testName, error.message);
  }
}

// ======================================================
// TEST 4
// Delivery trigger
// Request 5011 should be Pending
// Therefore delivery creation should fail
// ======================================================

async function testDeliveryTrigger() {
  const testName = "Delivery trigger rejects unapproved request";

  try {
    const { response, data } = await post("/api/create-delivery", {
      delivery_id: 990011,
      center_id: 1,
      request_id: 5011,
    });

    if (!response.ok && data.error) {
      pass(testName);
    } else {
      fail(testName, "Delivery was accepted for an unapproved request");
    }
  } catch (error) {
    fail(testName, error.message);
  }
}

// ======================================================
// TEST 5
// Complete Multi-Database Workflow
// MongoDB + Neo4j + Oracle
// ======================================================

async function testCompleteWorkflow() {
  const testName = "Complete MongoDB + Neo4j + Oracle workflow";

  try {
    const { response, data } = await post("/api/workflow", {
      unit_id: 2002,
      center_id: 1,
      hospital_id: 103,
      request_id: 5010,
    });

    // ---------------------------
    // Check MongoDB result
    // ---------------------------

    const mongoOK =
      data.mongo &&
      data.mongo.profile &&
      data.mongo.profile.unit_id === 2002 &&
      data.mongo.coldChain &&
      data.mongo.coldChain.unit_id === 2002;

    // ---------------------------
    // Check Neo4j result
    // ---------------------------

    const neo4jOK =
      data.neo4j &&
      Array.isArray(data.neo4j.route) &&
      data.neo4j.route.length > 0 &&
      typeof data.neo4j.distance_km === "number";

    // ---------------------------
    // Check Oracle result
    // ---------------------------

    const oracleOK =
      data.oracle &&
      data.oracle.request &&
      data.oracle.request.REQUEST_ID === 5010 &&
      Array.isArray(data.oracle.auditLog) &&
      data.oracle.auditLog.length > 0;

    // ---------------------------
    // Final result
    // ---------------------------

    if (response.ok && mongoOK && neo4jOK && oracleOK) {
      pass(testName);
    } else {
      fail(
        testName,
        data.error ||
          `MongoDB=${mongoOK}, Neo4j=${neo4jOK}, Oracle=${oracleOK}`,
      );
    }
  } catch (error) {
    fail(testName, error.message);
  }
}

// ======================================================
// RUN ALL AUTOMATED TESTS
// ======================================================

async function runTests() {
  console.log("");
  console.log("==========================================");
  console.log("HealthLink Automated Tests");
  console.log("==========================================");
  console.log("");

  await testAvailableUnits();

  await testRequestFulfillment();

  await testInvalidBloodUnit();

  await testDeliveryTrigger();

  await testCompleteWorkflow();

  console.log("");
  console.log("==========================================");
  console.log("Test Summary");
  console.log("==========================================");

  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total: ${passed + failed}`);

  if (failed === 0) {
    console.log("");
    console.log("ALL AUTOMATED TESTS PASSED");
  } else {
    console.log("");
    console.log("SOME AUTOMATED TESTS FAILED");
  }
}

runTests();
