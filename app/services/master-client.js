import Game from 'models/game';
import GameClient from 'services/game-client';

class MasterClient extends GameClient {
  constructor(url) {
    super(url);

    this.game = null;
  }

  createGame() {
    // push GameCreate event?
    this.game = new Game(this, this.players);
  }

  startGame(leaderPosition) {
    // push GameStart event
    const position = leaderPosition || Math.floor(Math.random() * this.players.length);

    this.game.start(position);
  }

  endGame() {
    // clear out db events
  }

  onTeamChosen() {
    super.onTeamChosen(arguments);
    // push TeamVote event
  }

  onVote({ accept }) {
    super.onVote(arguments);
    this.game.recordVote(accept);
  }

  onMissionCardChosen({ success }) {
    this.game.recordMissionCard(success);
  }
}

export default MasterClient;
