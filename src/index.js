import express from 'express';
import { createServer } from "http";
import { Server } from "socket.io";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

io.on('connect', (socket) => {
    console.log("user connected", socket.id);
})

// store static files in "public" directory
// all requests will be relative to the "public" directory
// by default, will get index.html if no other resource is specified
app.use(express.static("public"));

httpServer.listen(5000);