const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: { type: String },
    email: { type: String, required: true, unique: true },
    password: { type: String },
    googleId: { type: String },
    avatar: { type: String },
    phone: { type: String, default: null },
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: { type: String, default: null },
    isVerified: { type: Boolean, default: false },
    isLoggedIn: { type: Boolean, default: false },
    token: { type: String, default: null },
    deactivated: { type: Boolean, default: false },
    deactivationRequested: { type: Boolean, default: false },
    deactivationRequestedAt: { type: Date, default: null },
    loginAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date, default: null },
}, { timestamps: true });

const UsersModel = mongoose.model('Users', UserSchema);
module.exports = UsersModel;