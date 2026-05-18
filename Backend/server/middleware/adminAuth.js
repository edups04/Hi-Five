const jwt = require('jsonwebtoken');

const isAdmin = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'Admin token missing' });
    }

    const token = authHeader.split(' ')[1];

    const verify = (secret) => {
        return new Promise((resolve, reject) => {
            jwt.verify(token, secret, (err, decoded) => {
                if (err) reject(err);
                else resolve(decoded);
            });
        });
    };

    Promise.any([
        verify(process.env.ADMIN_SECRET),
        verify(process.env.SECRET_KEY),
    ])
    .then(decoded => {
        if (decoded.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }
        req.admin = decoded;
        next();
    })
    .catch(() => {
        res.status(401).json({ success: false, message: 'Invalid or expired admin token' });
    });
};

module.exports = { isAdmin };