import express from "express";
import dotenv from "dotenv";
import oracledb from "oracledb";

import { connectMongo, getMongoDB } from "./db/mongo.js";

import {
  testNeo4jConnection,
  initializeNeo4jGraph,
  getNeo4jDriver,
} from "./db/neo4j.js";
import { getOracleConnection } from "./db/oracle.js";

dotenv.config();

const app = express();

app.use(express.json());
app.use(express.static("public"));
// ======================================================
// ADD BLOOD UNIT
// Inserts a new blood unit into Oracle
// ======================================================

app.post("/api/add-blood-unit", async (req, res) => {
  const {
    unit_id,
    center_id,
    blood_group,
    collection_date,
    expiry_date,
    status,
  } = req.body;

  let connection;

  try {
    connection = await getOracleConnection();

    await connection.execute(
      `
      INSERT INTO Blood_Unit (
        Unit_ID,
        Center_ID,
        Blood_Group,
        Collection_Date,
        Expiry_Date,
        Status
      )
      VALUES (
        :unit_id,
        :center_id,
        :blood_group,
        TO_DATE(:collection_date, 'YYYY-MM-DD'),
        TO_DATE(:expiry_date, 'YYYY-MM-DD'),
        :status
      )
      `,
      {
        unit_id: Number(unit_id),
        center_id: Number(center_id),
        blood_group,
        collection_date,
        expiry_date,
        status,
      },
    );

    await connection.commit();

    const result = await connection.execute(
      `
      SELECT
        Unit_ID,
        Center_ID,
        Blood_Group,
        Collection_Date,
        Expiry_Date,
        Status
      FROM Blood_Unit
      WHERE Unit_ID = :unit_id
      `,
      {
        unit_id: Number(unit_id),
      },
      {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      },
    );

    res.json({
      message: "Blood unit added successfully",
      blood_unit: result.rows[0],
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    console.error(error);

    res.status(400).json({
      error: error.message,
    });
  } finally {
    if (connection) {
      await connection.close();
    }
  }
});
// ======================================================
// 1. CHECK AVAILABLE BLOOD UNITS
// Uses Oracle function: Get_Available_Units
// ======================================================

app.post("/api/available-units", async (req, res) => {
  const { center_id, blood_group } = req.body;

  let connection;

  try {
    connection = await getOracleConnection();

    const result = await connection.execute(
      `
            SELECT Get_Available_Units(
                :center_id,
                :blood_group
            ) AS AVAILABLE_UNITS
            FROM dual
            `,
      {
        center_id: Number(center_id),
        blood_group: blood_group,
      },
      {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      },
    );

    res.json({
      available_units: result.rows[0].AVAILABLE_UNITS,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: error.message,
    });
  } finally {
    if (connection) {
      await connection.close();
    }
  }
});

// ======================================================
// 2. RESERVE BLOOD UNIT
// Uses Oracle procedure: Reserve_Blood_Unit
// ======================================================

app.post("/api/reserve-unit", async (req, res) => {
  const { unit_id } = req.body;

  let connection;

  try {
    connection = await getOracleConnection();

    await connection.execute(
      `
            BEGIN
                Reserve_Blood_Unit(:unit_id);
            END;
            `,
      {
        unit_id: Number(unit_id),
      },
    );

    await connection.commit();

    const result = await connection.execute(
      `
            SELECT
                Unit_ID,
                Center_ID,
                Blood_Group,
                Status
            FROM Blood_Unit
            WHERE Unit_ID = :unit_id
            `,
      {
        unit_id: Number(unit_id),
      },
      {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      },
    );

    res.json({
      message: "Blood unit reserved successfully",
      blood_unit: result.rows[0],
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    console.error(error);

    res.status(500).json({
      error: error.message,
    });
  } finally {
    if (connection) {
      await connection.close();
    }
  }
});

// ======================================================
// 3. CHECK WHETHER REQUEST CAN BE FULFILLED
// Uses package function:
// Blood_Request_Package.Can_Fullfill_Request
// ======================================================

app.post("/api/check-request", async (req, res) => {
  const { request_id } = req.body;

  let connection;

  try {
    connection = await getOracleConnection();

    const result = await connection.execute(
      `
            SELECT
                Blood_Request_Package.Can_Fullfill_Request(
                    :request_id
                ) AS CAN_FULFILL
            FROM dual
            `,
      {
        request_id: Number(request_id),
      },
      {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      },
    );

    const value = result.rows[0].CAN_FULFILL;

    res.json({
      can_fulfill: value === 1,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: error.message,
    });
  } finally {
    if (connection) {
      await connection.close();
    }
  }
});

// ======================================================
// 4. PROCESS BLOOD REQUEST
// Uses package procedure:
// Blood_Request_Package.Process_Request
// ======================================================

app.post("/api/process-request", async (req, res) => {
  const { request_id } = req.body;

  let connection;

  try {
    connection = await getOracleConnection();

    await connection.execute(
      `
            BEGIN
                Blood_Request_Package.Process_Request(
                    :request_id
                );
            END;
            `,
      {
        request_id: Number(request_id),
      },
    );

    await connection.commit();

    const requestResult = await connection.execute(
      `
                SELECT
                    Request_ID,
                    Hospital_ID,
                    Priority,
                    Status
                FROM Blood_Request
                WHERE Request_ID = :request_id
                `,
      {
        request_id: Number(request_id),
      },
      {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      },
    );

    const auditResult = await connection.execute(
      `
                SELECT
                    Audit_ID,
                    Request_ID,
                    Action_Type,
                    Action_Date,
                    User_Name,
                    Details
                FROM Audit_Log
                WHERE Request_ID = :request_id
                ORDER BY Action_Date DESC
                `,
      {
        request_id: Number(request_id),
      },
      {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      },
    );

    res.json({
      message: "Request processed successfully",

      request: requestResult.rows[0],

      audit: auditResult.rows[0],
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    console.error(error);

    res.status(500).json({
      error: error.message,
    });
  } finally {
    if (connection) {
      await connection.close();
    }
  }
});

// ======================================================
// 5. CREATE DELIVERY
// Automatically activates Validate_Delivery_Request_trig
// ======================================================

app.post("/api/create-delivery", async (req, res) => {
  const { delivery_id, center_id, request_id } = req.body;

  let connection;

  try {
    connection = await getOracleConnection();

    await connection.execute(
      `
            INSERT INTO Delivery (
                Delivery_ID,
                Center_ID,
                Request_ID,
                Delivery_Date,
                Delivery_Status
            )
            VALUES (
                :delivery_id,
                :center_id,
                :request_id,
                SYSDATE,
                'Preparing'
            )
            `,
      {
        delivery_id: Number(delivery_id),

        center_id: Number(center_id),

        request_id: Number(request_id),
      },
    );

    await connection.commit();

    const result = await connection.execute(
      `
            SELECT
                Delivery_ID,
                Center_ID,
                Request_ID,
                Delivery_Date,
                Delivery_Status
            FROM Delivery
            WHERE Delivery_ID = :delivery_id
            `,
      {
        delivery_id: Number(delivery_id),
      },
      {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      },
    );

    res.json({
      message: "Delivery created successfully",

      delivery: result.rows[0],
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    console.error(error);

    res.status(500).json({
      error: error.message,
    });
  } finally {
    if (connection) {
      await connection.close();
    }
  }
});

// ======================================================
// 6. COMPLETE MULTI-DATABASE WORKFLOW
// MongoDB + Neo4j + Oracle
// ======================================================

app.post("/api/workflow", async (req, res) => {
  const { unit_id, center_id, hospital_id, request_id } = req.body;

  let oracleConnection;
  let neo4jSession;

  try {
    // -------------------------
    // MongoDB
    // -------------------------

    const mongoDB = getMongoDB();

    const profile = await mongoDB.collection("BloodUnitProfiles").findOne({
      unit_id: Number(unit_id),
    });

    const coldChain = await mongoDB.collection("ColdChainLogs").findOne({
      unit_id: Number(unit_id),
    });

    // -------------------------
    // Neo4j
    // -------------------------

    const driver = getNeo4jDriver();

    neo4jSession = driver.session();

    const routeResult = await neo4jSession.run(
      `
                MATCH
                    (source:BloodCenter {
                        center_id: $center_id
                    })

                MATCH
                    (target:Hospital {
                        hospital_id: $hospital_id
                    })

                CALL gds.shortestPath.dijkstra.stream(
                    'healthlinkRoutes',
                    {
                        sourceNode: source,
                        targetNodes: [target],
                        relationshipWeightProperty:
                            'distance_km'
                    }
                )

                YIELD
                    totalCost,
                    nodeIds

                RETURN
                    [
                        n IN nodeIds |
                        gds.util.asNode(n).name
                    ] AS route,

                    totalCost AS distance_km
                `,
      {
        center_id: Number(center_id),

        hospital_id: Number(hospital_id),
      },
    );

    if (routeResult.records.length === 0) {
      return res.status(404).json({
        error: "No delivery route found",
      });
    }

    const routeRecord = routeResult.records[0];

    const route = routeRecord.get("route");

    const distance = routeRecord.get("distance_km");

    // -------------------------
    // Oracle
    // -------------------------

    oracleConnection = await getOracleConnection();

    await oracleConnection.execute(
      `
            BEGIN
                Blood_Request_Package.Process_Request(
                    :request_id
                );
            END;
            `,
      {
        request_id: Number(request_id),
      },
    );

    await oracleConnection.commit();

    const requestResult = await oracleConnection.execute(
      `
                SELECT
                    Request_ID,
                    Hospital_ID,
                    Request_Date,
                    Priority,
                    Status
                FROM Blood_Request
                WHERE Request_ID = :request_id
                `,
      {
        request_id: Number(request_id),
      },
      {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      },
    );

    const auditResult = await oracleConnection.execute(
      `
                SELECT
                    Audit_ID,
                    Request_ID,
                    Action_Type,
                    Action_Date,
                    User_Name,
                    Details
                FROM Audit_Log
                WHERE Request_ID = :request_id
                ORDER BY Action_Date DESC
                `,
      {
        request_id: Number(request_id),
      },
      {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      },
    );

    res.json({
      mongo: {
        profile,
        coldChain,
      },

      neo4j: {
        route,
        distance_km: distance,
      },

      oracle: {
        request: requestResult.rows[0],

        auditLog: auditResult.rows,
      },
    });
  } catch (error) {
    console.error("Workflow error:", error);

    if (oracleConnection) {
      try {
        await oracleConnection.rollback();
      } catch (rollbackError) {
        console.error("Rollback error:", rollbackError);
      }
    }

    res.status(500).json({
      error: error.message,
    });
  } finally {
    if (neo4jSession) {
      await neo4jSession.close();
    }

    if (oracleConnection) {
      await oracleConnection.close();
    }
  }
});

// ======================================================
// START SERVER
// ======================================================

async function startServer() {
  try {
    await connectMongo();

    await testNeo4jConnection();

    await initializeNeo4jGraph();

    const oracleConnection = await getOracleConnection();

    console.log("Oracle connected");

    await oracleConnection.close();

    app.listen(process.env.PORT, () => {
      console.log(`Server running on http://localhost:${process.env.PORT}`);
    });
  } catch (error) {
    console.error("Connection error:", error);
  }
}

startServer();
