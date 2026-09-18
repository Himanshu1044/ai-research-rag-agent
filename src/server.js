import "./config/env.js";
import app from './app.js';

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is listening on port ${PORT}`)
})