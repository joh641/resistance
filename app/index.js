import sha256 from 'lib/sha256';
import GameClient from 'services/game-client';
import MasterClient from 'services/master-client';

const HASHED_PW = 'f00a787f7492a95e165b470702f4fe9373583fbdc025b2c8bdf0262cc48fcff4';
const MASTER = 'fc613b4dfd6736a7bd268c8a0e74ed0d1c04a959f59dd74ef2874983fd443fc9';
const password = prompt('Password?');
let gameClient;

switch (sha256.hash(password)) {
  case HASHED_PW:
    gameClient = new GameClient('https://shining-fire-2823.firebaseio.com/');
    break;
  case MASTER:
    window.gameClient = gameClient = new MasterClient('https://shining-fire-2823.firebaseio.com/');
    break;
}

if (gameClient) { gameClient.signIn(); }

window.onbeforeunload = () => {
  return 'La Resistance';
};
