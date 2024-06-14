import { io } from "https://cdn.socket.io/4.7.5/socket.io.esm.min.js";

const socket = io('ws://localhost:5000');

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let maps2D = null;
let images = {};
const TILE_SIZE = 16;

socket.on("connect", () => {
    console.log("connected");
});

socket.on('map', (maps) => {
    maps2D = maps;
    console.log('map', maps2D);
    window.requestAnimationFrame(loop);
});

function loop() {
    ctx.clearRect(0,0, ctx.width, ctx.height);
    
    for(let map_ind=0; map_ind < maps2D.length; map_ind++){
        for(let row=0; row < maps2D[map_ind].length; row++){
            for(let col=0; col < maps2D[map_ind][0].length; col++){
                const tile = maps2D[map_ind][row][col]
                if(!tile)
                    continue;

                if(!images[tile.src]){
                    images[tile.src] = new Image();
                    images[tile.src].src = tile.src;
                    // console.log(images[tile.src]);
                    // console.log(tile);
                }
                const cols = tile.width / TILE_SIZE;
                const rows = tile.height / TILE_SIZE;
                const imageRow = parseInt(tile.id / cols);
                const imageCol = tile.id % cols;
                ctx.drawImage(images[tile.src], imageCol * TILE_SIZE, imageRow * TILE_SIZE, TILE_SIZE, TILE_SIZE, 
                    col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            }
        }
    }
    


    window.requestAnimationFrame(loop);
}
