const express = require("express");
const cors = require("cors");
const app = express();
const port = 5000; // Puedes cambiar el puerto si es necesario

app.use(cors());
app.use(express.json());

const userRoutes = require("./routes/userRoutes");
const virtualCashPointsRoutes = require("./routes/virtualCashPointsRoutes");

app.use("/api/users", userRoutes);
app.use("/api/virtualCashPoints", virtualCashPointsRoutes);

app.listen(port, () => {
  console.log(`Servidor Express escuchando en el puerto ${port}`);
});
