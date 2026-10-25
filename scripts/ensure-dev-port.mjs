import net from "node:net";

const port = Number(process.env.PORT || 3004);
const host = "127.0.0.1";
const server = net.createServer();

server.once("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(
      `Development port ${port} is already in use. Stop the existing process or start Next.js with another port.`
    );
  } else {
    console.error(`Could not check development port ${port}:`, error.message);
  }
  process.exitCode = 1;
});

server.listen(port, host, () => {
  server.close((error) => {
    if (error) {
      console.error(`Could not release development port ${port}:`, error.message);
      process.exitCode = 1;
      return;
    }
    console.log(`Development port ${port} is available.`);
  });
});
