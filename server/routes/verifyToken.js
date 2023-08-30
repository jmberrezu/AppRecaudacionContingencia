const jwt = require("jsonwebtoken");

// Middleware para verificar el token antes de procesar la solicitud
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  // Si no se proporciona el token
  if (!token) {
    return res.status(401).json({ message: "Token no provided" });
  }

  try {
    const decoded = jwt.verify(token, "admin_CTIC_2023!");
    req.user = decoded; // Guardar la información del usuario en el objeto de solicitud
    next(); // Continuar con la siguiente función (manejador de la ruta)
  } catch (error) {
    res.status(401).json({ message: "Invalid Token" });
  }
};

module.exports = verifyToken;
