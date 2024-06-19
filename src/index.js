import express from 'express';
import { createServer } from "http";
import { Server } from "socket.io";
import loadMap from './mapLoader.js';
import pkg from 'agora-access-token';
const { RtcTokenBuilder, RtcRole } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);
const PORT = process.env.PORT || 5000;
const APP_ID = process.env.APP_ID;
const APP_CERTIFICATE = process.env.APP_CERTIFICATE;

// do not cache the agora token (get a fresh one each time)
const nocache = (_, resp, next) => {
    resp.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    resp.header('Expires', '-1');
    resp.header('Pragma', 'no-cache');
    next();
};
const generateRTCToken = (req, resp) => { 
    resp.header('Access-Control-Allow-Origin', '*');
    const channelName = req.params.channel;
    if(channelName !== 'game') return resp.status(500).json({'error': 'channel should be "game"'});

    const role = RtcRole.PUBLISHER;
    // don't care about uid authentication
    const uid = 0;
    const expireTime = 3600 + (Date.now()/1000);
    const token = RtcTokenBuilder.buildTokenWithUid(APP_ID, APP_CERTIFICATE, channelName, uid, role, expireTime);
    return resp.status(200).json({'token':token});
};
app.get('/access_token/:channel', nocache , generateRTCToken);

const TICK_RATE = 120;
const SPEED = TICK_RATE * .0025;
const ARROW_SPEED = SPEED * 2.5;

function isColliding(rect1, rect2){
    return (rect1.x < rect2.x + rect2.w &&
            rect1.x + rect1.w > rect2.x &&
            rect1.y < rect2.y + rect2.h &&
            rect1.y + rect1.h > rect2.y);
}

function tick(dt) {
    for (const player of players) {
        const inputs = inputsMap[player.id];
        const prevX = player.x;
        const prevY = player.y;
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

        const objMap = maps2D.at(-1);
        for(let row=0; row < objMap.length; row++){
            for(let col=0; col < objMap[0].length; col++){
                const tile = objMap[row][col]
                if(!tile)
                    continue;
                if(isColliding(
                    {
                        x:player.x + archer.drawnSize/2, 
                        y:player.y + archer.drawnSize*(9/10), 
                        w:archer.drawnSize/40, 
                        h:archer.drawnSize/10},
                    {
                        x:Math.floor(col * TILE_SIZE * ZOOM), 
                        y:Math.floor(row * TILE_SIZE * ZOOM), 
                        w: Math.floor(TILE_SIZE * ZOOM), 
                        h: Math.floor(TILE_SIZE * ZOOM)})
                    ){
                            player.x = prevX;
                            player.y = prevY;
                            break;

                }

            }
        }
    }
    arrows.forEach((arrow) => {
        arrow.x += Math.cos(arrow.angle) * ARROW_SPEED * dt;
        arrow.y += Math.sin(arrow.angle) * ARROW_SPEED * dt;
        arrow.TTL -= dt;

        //rcos(theta) + arrow.x
        //rsin(theta) + arrow.y
        const arrowHeadX = (Math.cos(arrow.angle) * arrow_sprite.drawnWidth) + arrow.x;
        const arrowHeadY = (Math.sin(arrow.angle) * arrow_sprite.drawnWidth) + arrow.y;

        for (const player of players){
            
            if(arrow.id !== player.id &&
                arrowHeadX >= player.x && arrowHeadX <= player.x + archer.drawnSize
                && arrowHeadY >= player.y && arrowHeadY <= player.y + archer.drawnSize){
                    player.x = mapWidth/2;
                    player.y = mapHeight/2;
                    arrow.TTL = 0;
                    break;
            }
        }
    });

    arrows = arrows.filter((arrow) => arrow.TTL > 0);

    io.emit("players", players);
    io.emit("arrows", arrows);
};

const arrowCD = 250;
const inputsMap = {};
const ZOOM = 1.5;
const TILE_SIZE = 16;
let mapHeight = null;
let mapWidth = null;
let maps2D = null;
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
const mic = {};
mic.src = "/Art/mic.png";
mic.size = 512;
mic.drawnSize = Math.floor(TILE_SIZE * ZOOM * 1.25);

async function main() {
    maps2D = await loadMap();

    // console.log(maps2D[1].length);
    io.on('connect', (socket) => {
        console.log("user connected", socket.id);
        
        inputsMap[socket.id] = {
            up: false,
            down: false,
            left: false,
            right: false
        };
        mapHeight = TILE_SIZE * (maps2D[0].length) * ZOOM;
        mapWidth = TILE_SIZE * (maps2D[0][0].length) * ZOOM;
        const player = {
            id: socket.id,
            x: mapWidth/2,
            y: mapHeight/2,
            isMuted: false,
            voice_id: null,
            facing: 'right'
        };
        players.push(player);

        socket.emit("init", {ZOOM: ZOOM, 
            TILE_SIZE: TILE_SIZE, 
            mapHeight: mapHeight, 
            mapWidth: mapWidth,
            archer_spr: archer, 
            arrow_spr: arrow_sprite,
            mic_spr: mic});
        socket.emit("map", maps2D);

        socket.on("voice_id", (voice_id) => {
            player.voice_id = voice_id;
        })

        socket.on('input', (inputs) => {
            inputsMap[socket.id] = inputs;
        });

        let lastArrow = Date.now();
        socket.on('arrow', (arrow) => {
            const now = Date.now();
            const dt = now - lastArrow;
            if(dt > arrowCD){
                arrows.push(arrow);
                lastArrow = now;
            }
        })

        socket.on('mute', (isMuted) => {
            player.isMuted = isMuted;
        });

        socket.on('disconnect', () => {
            players = players.filter((player) => player.id !== socket.id);
        });
    });
    
    // store static files in "public" directory
    // all requests will be relative to the "public" directory
    // by default, will get index.html if no other resource is specified
    app.use(express.static("public"));
    
    httpServer.listen(PORT);

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