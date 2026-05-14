const jwt = require('jsonwebtoken');

const isAdmin = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'Admin token missing' });
    }

    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.ADMIN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({ success: false, message: 'Invalid or expired admin token' });
        }
        if (decoded.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }
        req.admin = decoded;
        next();
    });
};

module.exports = { isAdmin };
