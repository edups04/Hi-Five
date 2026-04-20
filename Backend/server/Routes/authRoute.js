const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const { isAuthenticated } = require('../middleware/isAuthenticated');

const router = express.Router();

// Step-1: Redirect to Google Login
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

router.get("/google/callback",
    passport.authenticate("google", { session: false }),
    (req, res) => {
        try {
            const token = jwt.sign(
                { id: req.user._id, email: req.user.email },
                process.env.SECRET_KEY,
                { expiresIn: "7d" }
            );
            res.redirect(`${process.env.CLIENT_URL}/auth-success?token=${token}`);
        } catch (error) {
            console.error("Google login error:", error);
            res.redirect(`${process.env.CLIENT_URL}/auth?error=google_failed`);
        }
    }
);

router.get("/me", isAuthenticated, (req, res) => {
    res.json({ success: true, user: req.user });
});

module.exports = router;