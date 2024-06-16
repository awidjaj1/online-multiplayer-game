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

                const cols = parseInt(tile.width / TILE_SIZE);
                const rows = parseInt(tile.height / TILE_SIZE);
                const imageRow = parseInt(tile.id / cols);
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
                    ctx.translate(-TILE_SIZE, 0); // Adjust position after flipping horizontally
                    widthScale = -1;
                }
                if(tile.vflip){
                    ctx.scale(1, -1); //make y scale negatively
                    ctx.translate(0, -TILE_SIZE); // Adjust position after flipping vertically
                    heightScale = -1;
                }
                ctx.drawImage(images[tile.src], imageCol * TILE_SIZE, imageRow * TILE_SIZE, TILE_SIZE, TILE_SIZE, 
                    col * TILE_SIZE * widthScale, row * TILE_SIZE * heightScale, TILE_SIZE, TILE_SIZE);
                // clear transforms using identity matrix
                ctx.setTransform(1, 0, 0, 1, 0, 0);
            }
        }
    }
    


    window.requestAnimationFrame(loop);
}
