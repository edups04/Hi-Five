const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const userModel = require('./models/users');
const UsersModel = require('./models/users');
const bcrypt = require('bcrypt');
 
const app = express();
app.use(express.json());
app.use(cors());

mongoose.connect("mongodb://127.0.0.1:27017/Hi-Five");

app.post('/login', async (req, res) => {
    const {email, password} = req.body;
    userModel.findOne({email: email})
    .then(user => {
        if(user) {
            bcrypt.compare(password, user.password, (err, response) =>{                
            if(response) {
                res.json("Success")
            } else {
                return res.json("The password is incorrect")
            }
        })
    } else {
            res.json("Account not found")
        }
    }) 
})

app.post('/signup', async (req, res) => {
    const {username, email, password} = req.body;
    bcrypt.hash(password, 10) 
    .then(hash => {
        UsersModel.create({username, email, password: hash})
        .then(user => res.json(user))
        .catch(err => res.json(err));
    }) .catch(err => console.log(err.message))

});

app.listen(3000, () => {
    console.log("Server is running on port 3000");
});