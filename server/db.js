const pgp = require("pg-promise")();
const connection = {
  host: "localhost",
  port: 5432,
  database: "db-recaudacion-contingencia",
  user: "postgres",
  password: "1234",
};

const db = pgp(connection);

module.exports = db;
