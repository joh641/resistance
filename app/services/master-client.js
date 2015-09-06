import Game from 'models/game';
import GameClient from 'services/game-client';

class MasterClient extends GameClient {
  constructor(url) {
    super(url);

    this.game = null;
  }

  createGame(players) {
    this.game = new Game(this, players);
  }

  startGame(leaderPosition) {
    const numPlayers = this.game.players.length;
    const position = leaderPosition || Math.floor(Math.random() * numPlayers);

    this.push({
      name: 'GameStart',
      data: { numPlayers }
    });
    this.game.start(position);
  }

  endGame() {
    // clear out db events
  }

  onTeamChosen({ team }) {
    super.onTeamChosen(arguments);
    this.game.setTeam(team);
    this.push({ name: 'TeamVote' });
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
