const express = require("express");
const cors = require("cors");

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

const userRoutes = require("./routes/userRoutes");
const virtualCashPointsRoutes = require("./routes/virtualCashPointsRoutes");
const loginRoutes = require("./routes/loginRoutes");

app.use("/api/users", userRoutes);
app.use("/api/virtualCashPoints", virtualCashPointsRoutes);
app.use("/api/login", loginRoutes);

app.listen(port, () => {
  console.log(`Servidor Express escuchando en el puerto ${port}`);
});
