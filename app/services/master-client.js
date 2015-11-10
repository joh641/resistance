import Game from 'models/game';
import GameClient from 'services/game-client';

class MasterClient extends GameClient {
  constructor(url) {
    super(url);

    this.game = null;
  }

  createGame(players, variant = null) {
    this.game = new Game(this, players, variant);
  }

  startGame(leaderPosition) {
    const players = this.game.players;
    const numPlayers = players.length;
    const leader = Number(leaderPosition);
    const isNum = !isNaN(leader);
    const position = isNum ? leader : Math.floor(Math.random() * numPlayers);

    this.push({
      name: 'GameStart',
      data: {
        players,
        positions: players.reduce((positions, player, idx) => {
          positions[player.id] = idx;

          return positions;
        }, {})
      }
    });
    this.game.start(position);
  }

  endGame() {
    this.db.set([]);
    this.push({ name: 'GameEnd' });
  }

  onTeamChosen({ team }) {
    super.onTeamChosen(...arguments);
    this.game.setTeam(team);
    this.push({ name: 'TeamVote' });
  }

  onVote({ approve }) {
    super.onVote(...arguments);
    this.game.recordVote(approve);
  }

  onMissionCardChosen({ success }) {
    this.game.recordMissionCard(success);
  }
}

export default MasterClient;
