const express = require("express");
const router = express.Router();
const db = require("../db"); // Asumiendo que db.js exporta la instancia de la base de datos

router.get("/buscar-cliente/:cuentaContrato", async (req, res) => {
  const { cuentaContrato } = req.params;

  try {
    const query =
      "SELECT * FROM Client WHERE PayerContractAccountID = $1 OR CUEN = $1;";
    const client = await db.any(query, [cuentaContrato]);

    if (client.length === 1) {
      res.status(200).json(client[0]);
    } else {
      res.status(404).json({ message: "Cliente no encontrado" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

module.exports = router;
