import express from 'express';
import { createServer } from "http";
import { Server } from "socket.io";
import loadMap from './mapLoader.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);


async function main() {
    const maps2D = await loadMap();

    // console.log(maps2D[1].length);
    io.on('connect', (socket) => {
        console.log("user connected", socket.id);

        socket.emit("map", maps2D);
    });
    
    // store static files in "public" directory
    // all requests will be relative to the "public" directory
    // by default, will get index.html if no other resource is specified
    app.use(express.static("public"));
    
    httpServer.listen(5000);
}

main();