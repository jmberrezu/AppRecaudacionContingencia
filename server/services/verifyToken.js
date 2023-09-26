const jwt = require("jsonwebtoken");

// Guardo un diccionario con el idglobaluser y el token
const activeTokens = new Map();

// Agregar un token al conjunto de tokens activos
function addActiveToken(idglobaluser, token) {
  // Si el usuario ya tiene un token activo, lo elimino
  if (activeTokens.has(idglobaluser)) {
    activeTokens.delete(idglobaluser);
  }

  // Agrego el nuevo token
  activeTokens.set(idglobaluser, token);
}

// Eliminar un token del conjunto de tokens activos
function deleteActiveToken(idglobaluser) {
  activeTokens.delete(idglobaluser);
}

// Middleware para verificar el token antes de procesar la solicitud
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  // Si no se proporciona el token
  if (!token) {
    return res.status(401).json({ message: "Token no provided" });
  }

  try {
    const decoded = jwt.verify(token, "admin_CTIC_2023!");

    let idglobaluser = "";

    if (decoded.role === "admin") {
      //Si es un usuario administrador
      idglobaluser = "admin";
    } else if (decoded.role === "supervisor") {
      //Si es un supervisor
      idglobaluser = decoded.idcashpoint;
    } else {
      //Si es un usuario
      idglobaluser = decoded.idglobaluser;
    }
    // Si el token no está activo
    if (token !== activeTokens.get(idglobaluser)) {
      return res
        .status(401)
        .json({ message: "Se ha iniciado sesión en otro dispositivo" });
    }

    req.user = decoded; // Guardar la información del usuario en el objeto de solicitud
    next(); // Continuar con la siguiente función (manejador de la ruta)
  } catch (error) {
    // Si el token ha expirado
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token Expired" });
    }
    res.status(401).json({ message: "Invalid Token" });
  }
};

module.exports = verifyToken;
module.exports.addActiveToken = addActiveToken;
module.exports.deleteActiveToken = deleteActiveToken;
