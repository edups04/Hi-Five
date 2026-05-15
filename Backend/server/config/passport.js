const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const UsersModel = require('../models/users');

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/auth/google/callback"
    },
    async (accessToken, refreshToken, profile, cb) => {
        try {
            const email = profile.emails[0].value;

            let user = await UsersModel.findOne({
                $or: [{ googleId: profile.id }, { email }]
            });

            if (user) {
                user.googleId = profile.id;
                user.isLoggedIn = true;
                user.avatar = user.avatar || profile.photos[0].value;
                user.isVerified = true;
                await user.save();
            } else {
                user = await UsersModel.create({
                    googleId: profile.id,
                    username: profile.displayName,
                    email,
                    avatar: profile.photos[0].value,
                    isVerified: true,
                });
            }

            return cb(null, user);

        } catch (err) {
            return cb(err, null);
        }
    }
));