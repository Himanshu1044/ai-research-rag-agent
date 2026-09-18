import pool from '../config/database.js';

export const getReport = async (req, res) => {
    try {
        const userId = req.user.userId;
        const reportId = req.params.id;

        const result = await pool.query(
            `SELECT
                r.id,
                r.content,
                r.created_at,
                r.updated_at
             FROM reports r
             JOIN research_requests rr
                 ON r.research_request_id = rr.id
             WHERE r.id = $1
             AND rr.user_id = $2`,
            [reportId, userId]
        );

        const report = result.rows[0];

        if (!report) {
            return res.status(404).json({
                error: 'Report not found'
            });
        }

        return res.status(200).json({
            report
        });

    } catch (err) {
        console.error(err);

        return res.status(500).json({
            error: 'Internal server error'
        });
    }
};