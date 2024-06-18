import express from 'express';
import { createServer } from "http";
import { Server } from "socket.io";
import loadMap from './mapLoader.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

const TICK_RATE = 30;
const SPEED = TICK_RATE * .005;
const ARROW_SPEED = SPEED * 2.5;

function tick(dt) {
    for (const player of players) {
        const inputs = inputsMap[player.id];
        if (inputs.up) {
            player.y -= SPEED * dt;
        } else if (inputs.down) {
            player.y += SPEED * dt;
        }

        if (inputs.right) {
            player.x += SPEED * dt;
            player.facing = 'right';
        } else if (inputs.left) {
            player.x -= SPEED * dt;
            player.facing = 'left';
        }
    }

    arrows.forEach((arrow) => {
        arrow.x += Math.cos(arrow.angle) * ARROW_SPEED * dt;
        arrow.y += Math.sin(arrow.angle) * ARROW_SPEED * dt;
        arrow.TTL -= dt;
    })

    arrows = arrows.filter((arrow) => arrow.TTL > 0);

    io.emit("players", players);
    io.emit("arrows", arrows);
}

const inputsMap = {};
let players = [];
let arrows = []

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
            y: 0,
            facing: 'right'
        });

        socket.emit("map", maps2D);

        socket.on('input', (inputs) => {
            inputsMap[socket.id] = inputs;
        });

        socket.on('arrow', (arrow) => {
            const player = players.find((player) => player.id === socket.id);
            arrows.push(arrow);
        })

        socket.on('disconnect', () => {
            players = players.filter((player) => player.id !== socket.id);
        });
    });
    
    // store static files in "public" directory
    // all requests will be relative to the "public" directory
    // by default, will get index.html if no other resource is specified
    app.use(express.static("public"));
    
    httpServer.listen(5000);

    // attempt to serve 30 frames per second
    // 1000 ms / TICK_RATE(=30)
    // keep track of delta time in case of time bleeding
    let lastUpdate = Date.now();
    setInterval(() => {
        const now = Date.now();
        const dt = now - lastUpdate;
        tick(dt);
        lastUpdate = now;
    }, 1000 / TICK_RATE);
}

main();