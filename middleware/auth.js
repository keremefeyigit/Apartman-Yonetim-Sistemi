const jwt = require('jsonwebtoken');

const getJwtSecret = () => {
    const secret = process.env.JWT_SECRET;
    if (process.env.NODE_ENV === 'production' && (!secret || secret === 'apartman_default_secret_key_change_in_prod')) {
        throw new Error('GÜVENLİK HATASI: Üretim ortamında güvenli bir JWT_SECRET tanımlanmalıdır!');
    }
    return secret || 'apartman_default_secret_key_change_in_prod';
};

const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Kimlik doğrulama gerekli.' });
    }

    try {
        const jwtSecret = getJwtSecret();
        jwt.verify(token, jwtSecret, (err, payload) => {
            if (err) {
                return res.status(403).json({ error: 'Geçersiz veya süresi dolmuş oturum.' });
            }
            req.user = payload;
            next();
        });
    } catch (err) {
        return res.status(500).json({ error: 'Kimlik doğrulama sunucu hatası.' });
    }
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
