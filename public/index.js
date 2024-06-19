import { io } from "https://cdn.socket.io/4.7.5/socket.io.esm.min.js";

let TILE_SIZE = null;
// zoom scales the tile size in the canvas
let ZOOM = 0;

// code from agora web SDK START
const client = AgoraRTC.createClient({mode: "rtc", codec: "vp8"});
const localTracks = {
    audioTrack: null
};
const remoteUsers = {};
const options = {
    appid: '9bd5b82699a74b7cb2f2ce9948e13be9',
    channel: 'game',
    uid: null,
    token: null
};
async function subscribe(user, mediaType) {
    await client.subscribe(user, mediaType);
    if (mediaType === 'audio') {
      user.audioTrack.play();
    }
}
function handleUserPublished(user, mediaType) {
    const id = user.uid;
    remoteUsers[id] = user;
    subscribe(user, mediaType);
}
function handleUserUnpublished(user) {
    const id = user.uid;
    delete remoteUsers[id];
}
async function join() {
    client.on("user-published", handleUserPublished);
    client.on("user-unpublished", handleUserUnpublished);
  
    [ options.uid, localTracks.audioTrack] = await Promise.all([
      client.join(options.appid, options.channel, options.token || null),
      AgoraRTC.createMicrophoneAudioTrack()
    ]);

    socket.emit("voice_id", options.uid);

    await client.publish(Object.values(localTracks));
}
join();
// code from agora web SDK END

const button = document.getElementById('mute');
button.addEventListener('click', () => {
    if(button.innerHTML === 'mute') {
        localTracks.audioTrack.setEnabled(false);
        button.innerHTML = 'unmute';
        socket.emit('mute', true);
    } else{
        localTracks.audioTrack.setEnabled(true);
        button.innerHTML = 'mute';
        socket.emit('mute', false);
    }
});

const archer = new Image();
const arrow_sprite = new Image();
const mic = new Image();
const walk = new Audio('/Audio/walk.wav');
walk.loop = true;
const socket = io();
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
// gets ride of tearing, this line only works after you set the canvas width and height for some reason
ctx.imageSmoothingEnabled = false;

let maps2D = null;
let images = {};
let players =  [];
let arrows = [];


let cameraX = 0;
let cameraY = 0;
let mapHeight = null;
let mapWidth = null;

socket.on('init', (settings) => {
    ZOOM = settings.ZOOM;
    TILE_SIZE = settings.TILE_SIZE;


    archer.src = settings.archer_spr.src;
    arrow_sprite.src = settings.arrow_spr.src;
    archer.size = settings.archer_spr.size;
    arrow_sprite.size = settings.arrow_spr.size;
    archer.drawnSize = Math.floor(TILE_SIZE * ZOOM * 3);
    arrow_sprite.drawnWidth = Math.floor(TILE_SIZE * ZOOM * 1.5);
    arrow_sprite.drawnHeight = Math.floor(TILE_SIZE * ZOOM * 5);
    mic.src = settings.mic_spr.src;
    mic.size = settings.mic_spr.size;
    mic.drawnSize = settings.mic_spr.drawnSize;

    mapHeight = settings.mapHeight;
    mapWidth = settings.mapWidth;
})

socket.on('map', (maps) => {
    maps2D = maps;
    console.log('map', maps2D);
    window.requestAnimationFrame(loop);
});

socket.on('players', (serverPlayers) => {
    players = serverPlayers;
});

socket.on('arrows', (serverArrows) => {
    arrows = serverArrows;
});

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
    if(Object.values(inputs).some(x => x)){
        walk.play();
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
    if(Object.values(inputs).every(x => x === false)){
        walk.pause();
    }
    socket.emit('input', inputs)
});

window.addEventListener('click', (e) => {
    const myPlayer = players.find((player) => player.id === socket.id);
    // get angle of click relative to player's position on the screen
    const angle = Math.atan2(e.clientY - (myPlayer.y + (archer.drawnSize/2) - cameraY), 
                            e.clientX - (myPlayer.x + (archer.drawnSize/2) - cameraX));
    const arrow = {angle, x:myPlayer.x + archer.drawnSize/2, y:myPlayer.y + archer.drawnSize/1.1, TTL: 1250, id:myPlayer.id};
    socket.emit("arrow", arrow);
});

function loop() {
    ctx.clearRect(0,0, canvas.width, canvas.height);

    const myPlayer = players.find((player) => player.id === socket.id);

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
        let widthScale = 1
        if(player.facing === 'left'){
            ctx.scale(-1, 1); //make x scale negatively
            ctx.translate(-archer.drawnSize, 0); // Adjust position after flipping horizontally
            widthScale = -1;
        }
        ctx.drawImage(archer, 0, 0, archer.size, archer.size, 
            (player.x - cameraX) * widthScale, 
            player.y - cameraY, 
            archer.drawnSize, 
            archer.drawnSize);
        if(!player.isMuted){
            ctx.drawImage(mic, 
            Math.floor((player.x + (widthScale*archer.drawnSize/4) - cameraX) * widthScale), 
            player.y - cameraY, 
            mic.drawnSize, 
            mic.drawnSize)
        }
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        
        if(remoteUsers[player.voice_id] && remoteUsers[player.voice_id].audioTrack){
            const distance = Math.sqrt((player.x - myPlayer.x) ** 2 + (player.y - myPlayer.y) ** 2);
            const volume = clamp((1 - (distance / (TILE_SIZE * ZOOM * 30))) * 105, 0, 100);
            // console.log(volume, player.voice_id);
            remoteUsers[player.voice_id].audioTrack.setVolume(volume);
        }
    });

    arrows.forEach((arrow) => {
        ctx.save();
        const arrowX = arrow.x - cameraX;
        const arrowY = arrow.y - cameraY;
        ctx.translate(arrowX, arrowY);
        // ctx.rect(0, 0, 10, 10);
        // ctx.fill();
        ctx.rotate(arrow.angle);
        ctx.drawImage(arrow_sprite, 0, 0, arrow_sprite.size, arrow_sprite.size, 
            -arrow_sprite.drawnWidth/4, 
            -arrow_sprite.drawnHeight/2, 
            arrow_sprite.drawnWidth, 
            arrow_sprite.drawnHeight);
        ctx.restore();
    });

    window.requestAnimationFrame(loop);
}

function clamp(val, min, max){{
    if(val < min) return min;
    else if(val > max) return max;
    return val;
}}