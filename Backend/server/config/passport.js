const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const UsersModel = require('../models/users');

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/auth/google/callback"
    },
    async(accessToken, refreshToken, profile, cb) => {
    console.log(profile);

    try {    
        let user = await UsersModel.findOneAndUpdate({ googleId: profile.id }, {isLoggedIn:true});

        if (!user) {
            user = await UsersModel.create({
                googleId: profile.id,
                username: profile.displayName,
                email: profile.emails[0].value,
                avatar: profile.photos[0].value,
                isVerified: true,
            })
        }

        return cb(null, user);
        
    } catch (err) {
        return cb(err, null);
    }

    }
));