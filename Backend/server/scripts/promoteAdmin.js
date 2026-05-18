require('dotenv').config();
const mongoose = require('mongoose');
const UsersModel = require('../models/users');

const TARGET_EMAIL = 'menchiesison77@gmail.com';

async function promoteToAdmin() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const user = await UsersModel.findOne({ email: TARGET_EMAIL });
        if (!user) {
            console.log(`No user found with email: ${TARGET_EMAIL}`);
            process.exit(1);
        }

        await UsersModel.findByIdAndUpdate(user._id, { role: 'admin' });
        console.log(`Successfully promoted ${TARGET_EMAIL} to admin`);
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

promoteToAdmin();