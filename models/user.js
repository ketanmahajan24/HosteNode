const mongoose = require('mongoose');
 
const bcrypt = require('bcryptjs');

// Define the User Schema
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    username: { type: String, unique: true, required: true },
    password: { type: String, required: true },  // Hashed password
});

// Hash the password before saving it to the database
userSchema.pre('save', async function(next) {
    // If the password is not modified, proceed to the next middleware
    if (!this.isModified('password')) return next();

    // Generate a salt and hash the password
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Method to compare the entered password with the hashed password
userSchema.methods.comparePassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Export the User model
module.exports = mongoose.model('User', userSchema);
