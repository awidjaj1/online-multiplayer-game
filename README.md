# online-multiplayer-game
Project to learn how to make multiplayer game in native js (without a game engine).

## Features
Uses a tmx parser to extract map info and then manually render the tiles to the page. Uses web sockets to communicate between frontend and backend.

Uses Agora io for in game proximity chat. Set up a token server to authenticate users (so people cannot run up minutes using my app id for purposes other than this game). Tokens are renewed when they're about to expire.

## Deployment?
https://crash-out-archer.onrender.com

Using Render's free tier web hosting service. After some inactivity, it takes a while (a couple of minutes) for the server to load since I'm using their free tier. 