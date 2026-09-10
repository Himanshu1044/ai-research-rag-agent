import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import "./env.js";
import pool from "./database.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const schemaPath = path.join(__dirname, "../../database/schema.sql");

const schema = fs.readFileSync(schemaPath, "utf-8");

try {
    await pool.query(schema);

    console.log("Database schema created successfully.");
} catch (error) {
    console.error("Database migration failed:", error);
} finally {
    await pool.end();
}