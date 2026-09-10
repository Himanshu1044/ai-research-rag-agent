import { Pool } from 'pg';
import './env.js'

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
})

export default pool;