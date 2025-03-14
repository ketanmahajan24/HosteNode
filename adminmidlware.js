const Admin = require("./models/admin.js"); // Import your Admin model

const checkAdminCredentials = async (req, res, next) => {
    try {
        const { username, password } = req.body.admin;

        // Check if both username and password are provided
        if (!username || !password) {
            return res.status(400).json({ message: "Username and password are required" });
        }

        // Find admin by username
        const admin = await Admin.findOne({ username });

        // If admin not found, or password is incorrect (without hashing for now)
        if (!admin || admin.password !== password) {
            return res.status(401).json({ message: "Invalid username or password" });
        }

        // Attach admin details to request object and move to next middleware/route
        req.admin = admin;
        next();
    } catch (err) {
        console.error("Error in checkAdminCredentials middleware:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

module.exports = checkAdminCredentials;
