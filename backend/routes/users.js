const express = require("express");
const router = express.Router();

const db = require("../db");


// GET ALL USERS
router.get("/", async (req, res) => {
    try {

        const [users] = await db.query(
            "SELECT id, name, email, role, created_at FROM users"
        );

        res.json({
            success: true,
            users: users
        });

    } catch (error) {

        console.error("Database error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch users"
        });

    }
});


module.exports = router;