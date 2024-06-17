import { io } from "https://cdn.socket.io/4.7.5/socket.io.esm.min.js";

const archer = new Image();
archer.src = "/Art/Archer/Idle.png";

const socket = io('ws://localhost:5000');
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
// gets ride of tearing, this line only works after you set the canvas width and height for some reason
ctx.imageSmoothingEnabled = false;

let maps2D = null;
let images = {};
let players =  [];
const TILE_SIZE = 16;
// zoom scales the tile size in the canvas
const ZOOM = 1.5;

socket.on("connect", () => {
    console.log("connected");
});

socket.on('map', (maps) => {
    maps2D = maps;
    console.log('map', maps2D);
    window.requestAnimationFrame(loop);
});

socket.on('players', (serverPlayers) => {
    players = serverPlayers;
})

const inputs = {
    up: false,
    down: false,
    left: false,
    right: false
};

window.addEventListener('keydown', (e) => {
    if (e.key === "w"){
        inputs.up = true;
    } else if (e.key === "s"){
        inputs.down = true;
    } else if (e.key === "d"){
        inputs.right = true;
    } else if (e.key === "a"){
        inputs.left = true;
    }
    socket.emit('input', inputs)
});

window.addEventListener('keyup', (e) => {
    if (e.key === "w"){
        inputs.up = false;
    } else if (e.key === "s"){
        inputs.down = false;
    } else if (e.key === "d"){
        inputs.right = false;
    } else if (e.key === "a"){
        inputs.left = false;
    }
    socket.emit('input', inputs)
});

function loop() {
    ctx.clearRect(0,0, canvas.width, canvas.height);

    const myPlayer = players.find((player) => player.id === socket.id);
    const mapHeight = TILE_SIZE * (maps2D[0].length) * ZOOM;
    const mapWidth = TILE_SIZE * (maps2D[0][0].length) * ZOOM;

    let cameraX = 0;
    let cameraY = 0;
    if (myPlayer) {
        // basically shift view to the center of the screen 
        // but then adjust left/right relative to character's position
        cameraX = Math.floor(clamp(myPlayer.x - canvas.width / 2, 0, mapWidth - canvas.width));
        cameraY = Math.floor(clamp(myPlayer.y - canvas.height / 2, 0, mapHeight - canvas.height));
    }

    
    for(let map_ind=0; map_ind < maps2D.length; map_ind++){
        for(let row=0; row < maps2D[map_ind].length; row++){
            for(let col=0; col < maps2D[map_ind][0].length; col++){
                const tile = maps2D[map_ind][row][col]
                if(!tile)
                    continue;

                const cols = Math.floor(tile.width / TILE_SIZE);
                const imageRow = Math.floor(tile.id / cols);
                const imageCol = tile.id % cols;
                let widthScale = 1;
                let heightScale = 1;

                if(!images[tile.src]){
                    images[tile.src] = new Image();
                    images[tile.src].src = tile.src;
                    // console.log(images[tile.src]);
                    // console.log(tile);
                    // console.log(imageRow, imageCol, rows, cols, tile.width, tile.height);
                }

                if(tile.hflip){
                    ctx.scale(-1, 1); //make x scale negatively
                    ctx.translate(Math.floor(-TILE_SIZE * ZOOM), 0); // Adjust position after flipping horizontally
                    widthScale = -1;
                }
                if(tile.vflip){
                    ctx.scale(1, -1); //make y scale negatively
                    ctx.translate(0, Math.floor(-TILE_SIZE * ZOOM)); // Adjust position after flipping vertically
                    heightScale = -1;
                }
                ctx.drawImage(images[tile.src], imageCol * TILE_SIZE, imageRow * TILE_SIZE, TILE_SIZE, TILE_SIZE, 
                Math.floor((col * TILE_SIZE * ZOOM - cameraX) * widthScale), 
                Math.floor((row * TILE_SIZE * ZOOM - cameraY) * heightScale), 
                Math.floor(TILE_SIZE * ZOOM), 
                Math.floor(TILE_SIZE * ZOOM));
                // clear transforms using identity matrix
                ctx.setTransform(1, 0, 0, 1, 0, 0);
            }
        }
    }
    
    players.forEach((player) => {
        // console.log(player.x - cameraX, player.y - cameraY,canvas.width/2, canvas.height/2);
        ctx.drawImage(archer, 0, 0, 128, 128, player.x - cameraX, player.y - cameraY, 
            Math.floor(TILE_SIZE * ZOOM * 3), 
            Math.floor(TILE_SIZE * ZOOM * 3));
    });

    window.requestAnimationFrame(loop);
}

function clamp(val, min, max){{
    if(val < min) return min;
    else if(val > max) return max;
    return val;
}}