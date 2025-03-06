const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String,  // or googleId if using Google login
    googleId: String,   // optional if you allow Google login
});

module.exports = mongoose.model('User', userSchema);
