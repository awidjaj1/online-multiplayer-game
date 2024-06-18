import express from 'express';
import { createServer } from "http";
import { Server } from "socket.io";
import loadMap from './mapLoader.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

const TICK_RATE = 30;
const SPEED = TICK_RATE * .0055;
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

        if(player.y < 0){
            player.y = 0;
        } else if(player.y + archer.drawnSize > mapHeight){
            player.y = mapHeight - archer.drawnSize;
        }

        if(player.x < 0){
            player.x = 0;
        } else if(player.x + archer.drawnSize > mapWidth){
            player.x = mapWidth - archer.drawnSize;
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
const ZOOM = 1.5;
const TILE_SIZE = 16;
let mapHeight = null;
let mapWidth = null;
let players = [];
let arrows = [];

const archer = {};
archer.src = "/Art/Archer/Idle.png";
archer.size = 128;
archer.drawnSize = Math.floor(TILE_SIZE * ZOOM * 3);
const arrow_sprite = {};
arrow_sprite.src = "/Art/Archer/Arrow.png";
arrow_sprite.size = 48;
arrow_sprite.drawnWidth = Math.floor(TILE_SIZE * ZOOM * 1.5);
arrow_sprite.drawnHeight = Math.floor(TILE_SIZE * ZOOM * 5);

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

        mapHeight = TILE_SIZE * (maps2D[0].length) * ZOOM;
        mapWidth = TILE_SIZE * (maps2D[0][0].length) * ZOOM;

        socket.emit("settings", {ZOOM: ZOOM, 
            TILE_SIZE: TILE_SIZE, 
            mapHeight: mapHeight, 
            mapWidth: mapWidth,
            archer_spr: archer, 
            arrow_spr: arrow_sprite});
        socket.emit("map", maps2D);

        socket.on('input', (inputs) => {
            inputsMap[socket.id] = inputs;
        });

        const arrowCD = 250;
        let lastArrow = Date.now();
        socket.on('arrow', (arrow) => {
            const now = Date.now();
            const dt = now - lastArrow;
            if(dt > arrowCD){
                arrows.push(arrow);
                lastArrow = now;
            }
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