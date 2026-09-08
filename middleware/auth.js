const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Kimlik doğrulama gerekli.' });
    }

    const jwtSecret = process.env.JWT_SECRET || 'apartman_default_secret_key_change_in_prod';
    jwt.verify(token, jwtSecret, (err, payload) => {
        if (err) {
            return res.status(403).json({ error: 'Geçersiz veya süresi dolmuş oturum.' });
        }
        req.user = payload;
        next();
    });
};

const authorizeRole = (roles = []) => (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({ error: 'Bu işlem için yetkiniz yok.' });
    }
    next();
};

module.exports = {
    verifyToken,
    authorizeRole
};
