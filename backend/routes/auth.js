const express = require("express");
const bcrypt = require("bcryptjs");

const router = express.Router();
const db = require("../db");


// ==========================================
// LOGIN
// ==========================================
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required"
            });
        }

        const [users] = await db.query(
            "SELECT * FROM users WHERE email = ?",
            [email.trim()]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        const user = users[0];

        const passwordMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        res.json({
            success: true,
            message: "Login successful",
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error("Login error:", error);

        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
});


// ==========================================
// BUSINESS OWNER REGISTRATION
// ==========================================
router.post("/register", async (req, res) => {
    try {
        const {
            name,
            email,
            password,
            role
        } = req.body;


        // Check required fields
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Name, email and password are required"
            });
        }


        // Only Business Owner registration is allowed
        if (role !== "business_owner") {
            return res.status(400).json({
                success: false,
                message: "Only Business Owner registration is enabled"
            });
        }


        // Minimum password length
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters"
            });
        }


        // Check if email already exists
        const [existingUsers] = await db.query(
            "SELECT id FROM users WHERE email = ?",
            [email.trim()]
        );

        if (existingUsers.length > 0) {
            return res.status(409).json({
                success: false,
                message: "An account with this email already exists"
            });
        }


        // Hash password before storing
        const hashedPassword = await bcrypt.hash(
            password,
            10
        );


        // Create Business Owner account
        const [result] = await db.query(
            `INSERT INTO users
            (name, email, password, role)
            VALUES (?, ?, ?, 'business_owner')`,
            [
                name.trim(),
                email.trim(),
                hashedPassword
            ]
        );


        // Successful registration response
        res.status(201).json({
            success: true,
            message: "Business Owner account created successfully",

            user: {
                id: result.insertId,
                name: name.trim(),
                email: email.trim(),
                role: "business_owner"
            }
        });

    } catch (error) {

        console.error("Registration error:", error);

        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
});


module.exports = router;