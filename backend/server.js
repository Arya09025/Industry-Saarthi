const express = require("express");
const cors = require("cors");
require("dotenv").config();

const db = require("./db");

// Routes
const usersRoutes = require("./routes/users");
const authRoutes = require("./routes/auth");

const app = express();


// Middleware
app.use(cors());
app.use(express.json());


// API Routes
app.use("/api/users", usersRoutes);
app.use("/api/auth", authRoutes);


// Home route
app.get("/", (req, res) => {
    res.json({
        message: "Industry Saarthi Backend is running!"
    });
});


// MySQL test route
app.get("/api/test-db", async (req, res) => {

    try {

        const [rows] = await db.query(
            "SELECT 1 AS result"
        );

        res.json({
            success: true,
            message: "MySQL connected successfully!",
            data: rows
        });

    } catch (error) {

        console.error("Database error:", error);

        res.status(500).json({
            success: false,
            message: "MySQL connection failed",
            error: error.message
        });

    }

});


// Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
});