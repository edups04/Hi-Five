require('dotenv').config();  

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const UsersModel = require('./models/users');
const bcrypt = require('bcrypt');
const authRoute = require('./Routes/authRoute');  
require('../config/passport');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const recordingsRouter = require('./Routes/recordings');

const app = express();
app.use(express.json());
app.use(cors());
app.use('/api/recordings', recordingsRouter);

mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("Connected to MongoDB Atlas"))
.catch(err => console.log(err));

app.use('/auth', authRoute)

app.post('/login', async (req, res) => {
    const {email, password} = req.body;
    UsersModel.findOne({email: email})
    .then(user => {
        if(user) {
            bcrypt.compare(password, user.password, (err, response) => {                
                if(response) {
                    // ✅ Generate token just like Google login
                    const token = jwt.sign(
                        { id: user._id, email: user.email },
                        process.env.SECRET_KEY,
                        { expiresIn: "7d" }
                    );
                    res.json({ success: true, message: "Login successful", token })
                } else {
                    res.json({ success: false, message: "The password is incorrect" })
                }
            })
        } else {
            res.json({ success: false, message: "Account not found" })
        }
    }) 
});

app.post('/signup', async (req, res) => {
    const {username, email, password} = req.body;
    bcrypt.hash(password, 10) 
    .then(hash => {
        UsersModel.create({username, email, password: hash})
        .then(user => res.status(201).json({ success: true, message: "Account created", user }))
        .catch(err => res.status(400).json({ success: false, message: err.message }));
    }).catch(err => res.status(500).json({ success: false, message: err.message }))
});

app.post('/forgot-password', (req, res) => {
    const { email } = req.body;
    UsersModel.findOne({ email: email })
    .then(user => {
        if(!user) {
            return res.send({ Status: "Account not found" });
        } 
        const token = jwt.sign({id: user._id, email: user.email}, process.env.SECRET_KEY, { expiresIn: "1h" });
        var transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
        var mailOptions = {
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: 'Password Reset Request',
            text: `You requested a password reset. Click the link to reset your password: http://localhost:5173/reset-password/${user._id}/${token}`
        };
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error(error);
            } else {
                return res.send({ Status: "Password reset email sent" });
            }
        });
    
    })
});

app.post('/reset-password/:id/:token', (req, res) => {
    const { id, token } = req.params
    const {password} = req.body;

    jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
        if(err) {
            return res.json({Status: "Error with token"})
        } else {
            bcrypt.hash(password, 10)
            .then(hash => {
            UsersModel.findByIdAndUpdate({_id: id}, {password: hash})
                .then(u => res.send({Status: "Success"}))
                .catch(err => res.send({Status: err}))
            }) 
            .catch(err => res.send({Status: err}))
        }
    })

})

app.post('/update-password', async (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ success: false, message: 'No token provided' });

    jwt.verify(token, process.env.SECRET_KEY, async (err, decoded) => {
        if (err) return res.status(403).json({ success: false, message: 'Invalid token' });

        const { currentPassword, newPassword } = req.body;

        try {
            const user = await UsersModel.findById(decoded.id);
            if (!user) return res.status(404).json({ success: false, message: 'User not found' });

            if (!user.password) {
                return res.status(400).json({ success: false, message: 'Cannot update password for Google accounts' });
            }

            const match = await bcrypt.compare(currentPassword, user.password);
            if (!match) return res.status(400).json({ success: false, message: 'Current password is incorrect' });

            const hash = await bcrypt.hash(newPassword, 10);
            await UsersModel.findByIdAndUpdate(decoded.id, { password: hash });

            res.json({ success: true, message: 'Password updated successfully' });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    });
});

app.listen(3000, () => {
    console.log("Server is running on port 3000");
});