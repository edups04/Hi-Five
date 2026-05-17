const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { isAuthenticated } = require('../middleware/isAuthenticated');

const router = express.Router();

const authCodes = new Map();

function generateAuthCode(userId, email) {
    const code = crypto.randomBytes(32).toString('hex');
    authCodes.set(code, {
        userId,
        email,
        expiresAt: Date.now() + 60 * 1000,
    });
    setTimeout(() => authCodes.delete(code), 60 * 1000);
    return code;
}

router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

router.get("/google/callback",
    (req, res, next) => {
        passport.authenticate("google", { session: false }, async (err, user, info) => {
            if (err) {
                return res.redirect(`${process.env.CLIENT_URL}/auth?error=google_failed`);
            }
            if (!user) {
                const reason = info?.message === 'deactivated' ? 'deactivated' : 'google_failed';
                return res.redirect(`${process.env.CLIENT_URL}/auth?error=${reason}`);
            }
            try {
                const code = generateAuthCode(user._id, user.email);
                res.redirect(`${process.env.CLIENT_URL}/auth-success?code=${code}`);
            } catch (error) {
                console.error("Google login error:", error);
                res.redirect(`${process.env.CLIENT_URL}/auth?error=google_failed`);
            }
        })(req, res, next);
    }
);

router.post("/exchange-code", (req, res) => {
    const { code } = req.body;
    if (!code) {
        return res.status(400).json({ success: false, message: "Missing code" });
    }

    const entry = authCodes.get(code);
    if (!entry) {
        return res.status(401).json({ success: false, message: "Invalid or expired code" });
    }
    if (Date.now() > entry.expiresAt) {
        authCodes.delete(code);
        return res.status(401).json({ success: false, message: "Code expired" });
    }

    authCodes.delete(code);

    const token = jwt.sign(
        { id: entry.userId, email: entry.email },
        process.env.SECRET_KEY,
        { expiresIn: "7d" }
    );

    res.json({ success: true, token });
});

router.get("/me", isAuthenticated, (req, res) => {
    res.json({ success: true, user: req.user });
});

module.exports = router;