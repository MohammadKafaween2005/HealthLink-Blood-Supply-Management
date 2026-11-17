import oracledb from "oracledb";
import dotenv from "dotenv";

dotenv.config();

export async function getOracleConnection() {
    const connection = await oracledb.getConnection({
        user: process.env.ORACLE_USER,
        password: process.env.ORACLE_PASSWORD,
        connectString: process.env.ORACLE_CONNECTION
    });

    return connection;
}