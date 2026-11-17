import neo4j from "neo4j-driver";
import dotenv from "dotenv";

dotenv.config();

const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD),
);

// Test connection
export async function testNeo4jConnection() {
  const serverInfo = await driver.getServerInfo();

  console.log("Neo4j connected");
  console.log(serverInfo.address);
}

// Automatically create GDS graph if missing
export async function initializeNeo4jGraph() {
  const session = driver.session();

  try {
    // Check whether projection exists
    const result = await session.run(`
            CALL gds.graph.exists('healthlinkRoutes')
            YIELD exists
            RETURN exists
        `);

    const exists = result.records[0].get("exists");

    if (exists) {
      console.log("Neo4j GDS graph healthlinkRoutes already exists");

      return;
    }

    // Create projection
    await session.run(`
            CALL gds.graph.project(
                'healthlinkRoutes',

                [
                    'BloodCenter',
                    'Hospital',
                    'Hub'
                ],

                {
                    ROUTE: {
                        properties: [
                            'distance_km',
                            'travel_minutes'
                        ],
                        orientation: 'UNDIRECTED'
                    }
                }
            )
        `);

    console.log("Neo4j GDS graph healthlinkRoutes created");
  } catch (error) {
    console.error("GDS graph initialization error:", error);

    throw error;
  } finally {
    await session.close();
  }
}

export function getNeo4jDriver() {
  return driver;
}
