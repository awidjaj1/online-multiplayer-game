import express from 'express';
import { createServer } from "http";
import { Server } from "socket.io";
import loadMap from './mapLoader.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

const SPEED = 10;
const TICK_RATE = 30;

function tick() {
    for (const player of players) {
        const inputs = inputsMap[player.id];
        if (inputs.up) {
            player.y -= SPEED;
        } else if (inputs.down) {
            player.y += SPEED;
        }

        if (inputs.right) {
            player.x += SPEED;
        } else if (inputs.left) {
            player.x -= SPEED;
        }
    }

    io.emit("players", players);
}

const inputsMap = {};
let players = [];

async function main() {
    const maps2D = await loadMap();

    // console.log(maps2D[1].length);
    io.on('connect', (socket) => {
        console.log("user connected", socket.id);

        inputsMap[socket.id] = {
            up: false,
            down: false,
            left: false,
            right: false
        };

        players.push({
            id: socket.id,
            x: 0,
            y: 0
        });

        socket.emit("map", maps2D);

        socket.on('input', (inputs) => {
            inputsMap[socket.id] = inputs;
        });

        socket.on('disconnect', () => {
            players = players.filter((player) => {player.id !== socket.id});
        });
    });
    
    // store static files in "public" directory
    // all requests will be relative to the "public" directory
    // by default, will get index.html if no other resource is specified
    app.use(express.static("public"));
    
    httpServer.listen(5000);

    // serve 30 frames per second
    // 1000 ms / TICK_RATE(=30)
    setInterval(tick, 1000 / TICK_RATE);
}

main();