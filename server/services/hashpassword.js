const bcrypt = require("bcrypt");

// Hasheo el password
const hashPassword = async (rawPassword) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(rawPassword, salt);
};

// Comprobar si una clave es correcta
const checkPassword = async (rawPassword, hash) => {
  return bcrypt.compare(rawPassword, hash);
};

module.exports = { hashPassword, checkPassword };
