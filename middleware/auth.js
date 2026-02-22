const jwt = require("jsonwebtoken");

const SECRET = process.env.JWT_SECRET || "meeramoda_secret";

module.exports = function (req, res, next) {

   
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ error: "No token provided" });
    }

     console.log(authHeader);
    const token = authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({ error: "Invalid token format" });
    }

    try {
        const decoded = jwt.verify(token, SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: "Token invalid or expired" });
    }
};