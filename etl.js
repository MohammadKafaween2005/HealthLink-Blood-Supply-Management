import dotenv from "dotenv";

import { getOracleConnection } from "./db/oracle.js";

import { connectMongo, getMongoDB } from "./db/mongo.js";

import { getNeo4jDriver, testNeo4jConnection } from "./db/neo4j.js";

dotenv.config();

// ======================================================
// ETL 1
// ORACLE BLOOD UNIT → MONGODB
// ======================================================

async function syncBloodUnitsToMongo() {
  let oracleConnection;

  try {
    oracleConnection = await getOracleConnection();

    const result = await oracleConnection.execute(
      `
                SELECT
                    Unit_ID,
                    Center_ID,
                    Blood_Group,
                    Collection_Date,
                    Expiry_Date,
                    Status
                FROM Blood_Unit
                `,
      [],
      {
        outFormat: (await import("oracledb")).default.OUT_FORMAT_OBJECT,
      },
    );

    const mongoDB = getMongoDB();

    for (const unit of result.rows) {
      await mongoDB.collection("BloodUnitProfiles").updateOne(
        {
          unit_id: unit.UNIT_ID,
        },
        {
          $set: {
            unit_id: unit.UNIT_ID,

            center_id: unit.CENTER_ID,

            blood_group: unit.BLOOD_GROUP,

            collection_date: unit.COLLECTION_DATE,

            expiry_date: unit.EXPIRY_DATE,

            status: unit.STATUS,
          },
        },
        {
          upsert: true,
        },
      );
    }

    console.log(`${result.rows.length} blood units synchronized to MongoDB`);
  } catch (error) {
    console.error("Blood Unit ETL error:", error);
  } finally {
    if (oracleConnection) {
      await oracleConnection.close();
    }
  }
}

// ======================================================
// ETL 2
// ORACLE BLOOD CENTERS → NEO4J
// ======================================================

async function syncBloodCentersToNeo4j() {
  let oracleConnection;
  let session;

  try {
    oracleConnection = await getOracleConnection();

    const result = await oracleConnection.execute(
      `
                SELECT
                    Center_ID,
                    Center_Name,
                    City
                FROM Blood_Center
                `,
      [],
      {
        outFormat: (await import("oracledb")).default.OUT_FORMAT_OBJECT,
      },
    );

    const driver = getNeo4jDriver();

    session = driver.session();

    for (const center of result.rows) {
      await session.run(
        `
                MERGE
                    (c:BloodCenter {
                        center_id: $center_id
                    })

                SET
                    c.name = $name,
                    c.city = $city
                `,
        {
          center_id: center.CENTER_ID,

          name: center.CENTER_NAME,

          city: center.CITY,
        },
      );
    }

    console.log(`${result.rows.length} blood centers synchronized to Neo4j`);
  } catch (error) {
    console.error("Blood Center ETL error:", error);
  } finally {
    if (session) {
      await session.close();
    }

    if (oracleConnection) {
      await oracleConnection.close();
    }
  }
}

// ======================================================
// ETL 3
// ORACLE HOSPITALS → NEO4J
// ======================================================

async function syncHospitalsToNeo4j() {
  let oracleConnection;
  let session;

  try {
    oracleConnection = await getOracleConnection();

    const result = await oracleConnection.execute(
      `
                SELECT
                    Hospital_ID,
                    Hospital_Name,
                    City
                FROM Hospital
                `,
      [],
      {
        outFormat: (await import("oracledb")).default.OUT_FORMAT_OBJECT,
      },
    );

    const driver = getNeo4jDriver();

    session = driver.session();

    for (const hospital of result.rows) {
      await session.run(
        `
                MERGE
                    (h:Hospital {
                        hospital_id: $hospital_id
                    })

                SET
                    h.name = $name,
                    h.city = $city
                `,
        {
          hospital_id: hospital.HOSPITAL_ID,

          name: hospital.HOSPITAL_NAME,

          city: hospital.CITY,
        },
      );
    }

    console.log(`${result.rows.length} hospitals synchronized to Neo4j`);
  } catch (error) {
    console.error("Hospital ETL error:", error);
  } finally {
    if (session) {
      await session.close();
    }

    if (oracleConnection) {
      await oracleConnection.close();
    }
  }
}

// ======================================================
// RUN ALL ETL
// ======================================================

async function runETL() {
  try {
    console.log("Starting HealthLink ETL...");

    await connectMongo();

    await testNeo4jConnection();

    await syncBloodUnitsToMongo();

    await syncBloodCentersToNeo4j();

    await syncHospitalsToNeo4j();

    console.log("ETL completed successfully");

    process.exit(0);
  } catch (error) {
    console.error("ETL failed:", error);

    process.exit(1);
  }
}

runETL();
