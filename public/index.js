import { io } from "https://cdn.socket.io/4.7.5/socket.io.esm.min.js";

const socket = io('ws://localhost:5000');

socket.on("connect", () => {
    console.log("connected");
});

socket.on('map', (map) => {
    console.log('map', map);
});