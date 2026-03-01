const express = require('express');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const router = express.Router();

// Generate JWT token
const generateToken = (user) => {
    return jwt.sign(
        {
            id: user._id,
            email: user.email,
            name: user.name,
            avatar: user.avatar
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
};

// @route   GET /auth/google
// @desc    Authenticate with Google
router.get('/google',
    passport.authenticate('google', {
        scope: ['profile', 'email'],
        session: false
    })
);

// @route   GET /auth/google/callback
// @desc    Google auth callback - returns JWT token
router.get('/google/callback',
    passport.authenticate('google', {
        session: false,
        failureRedirect: `${process.env.CLIENT_URL}/login?error=auth_failed`
    }),
    (req, res) => {
        // Generate JWT token
        const token = generateToken(req.user);

        // Redirect to client with token in URL
        res.redirect(`${process.env.CLIENT_URL}/auth/callback?token=${token}`);
    }
);

// @route   GET /auth/logout
// @desc    Logout user (client-side token removal)
router.get('/logout', (req, res) => {
    res.json({ message: 'Logout successful. Please remove the token from client.' });
});

// @route   GET /auth/me
// @desc    Get current user from JWT token
router.get('/me', (req, res) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.json({ user: null });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        res.json({
            user: {
                id: decoded.id,
                name: decoded.name,
                email: decoded.email,
                avatar: decoded.avatar
            }
        });
    } catch (error) {
        res.json({ user: null });
    }
});

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

router.verifyToken = verifyToken;

module.exports = router;
