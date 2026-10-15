import { spawn } from "node:child_process";

// Start the server and the worker as two separate processes
const server = spawn("node", ["src/server.js"], { stdio: "inherit" });
const worker = spawn("node", ["src/workers/researchWorker.js"], { stdio: "inherit" });

// If one stops, stop the other too (so the host restarts both)
server.on("exit", () => { worker.kill(); process.exit(1); });
worker.on("exit", () => { server.kill(); process.exit(1); });

// When we get Ctrl+C or the host stops us, stop both
process.on("SIGINT", () => { server.kill(); worker.kill(); });
process.on("SIGTERM", () => { server.kill(); worker.kill(); });