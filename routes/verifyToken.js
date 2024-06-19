const jwt = require("jsonwebtoken");

module.exports = function verifyJWT(req, res, next) {
    const token = req.header("auth-token");
    if (!token) return res.status(401).send({ access: false });

    try {
        const verified = jwt.verify(token, process.env.TOKEN_SECRET);
        req.user = verified;
        next();
    } catch (err) {
        console.error("Error verifying token:", err);
        res.status(400).send({ "valid-token": false });
    }
};
