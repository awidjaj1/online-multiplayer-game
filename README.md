# online-multiplayer-game
Project to learn how to make multiplayer game in native js (without a game engine).

## Features
Uses a tmx parser to extract map info and then manually render the tiles to the page. Uses web sockets to communicate between frontend and backend.

Uses Agora io for in game proximity chat. Set up a token server to authenticate users (so people cannot run up minutes using my app id for purposes other than this game). Tokens are renewed when they're about to expire.

## Deployment?
Not currently deployed. Write "npm run start" in the terminal in the folder containing the package.json file to run the server. Request the page by connecting to local host on port 5000.