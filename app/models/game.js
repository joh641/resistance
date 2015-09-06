import { shuffle } from 'lib/utils';

const GAMES = {
  5: { resistance: 3, spies: 2,
    missions: {
      1: { players: 2, fails: 1 },
      2: { players: 3, fails: 1 },
      3: { players: 2, fails: 1 },
      4: { players: 3, fails: 1 },
      5: { players: 3, fails: 1 }
    }
  },
  6: { resistance: 4, spies: 2,
    missions: {
      1: { players: 2, fails: 1 },
      2: { players: 3, fails: 1 },
      3: { players: 4, fails: 1 },
      4: { players: 3, fails: 1 },
      5: { players: 4, fails: 1 }
    }
  },
  7: { resistance: 4, spies: 3,
    missions: {
      1: { players: 2, fails: 1 },
      2: { players: 3, fails: 1 },
      3: { players: 3, fails: 1 },
      4: { players: 4, fails: 2 },
      5: { players: 4, fails: 1 }
    }
  },
  8: { resistance: 5, spies: 3,
    missions: {
      1: { players: 3, fails: 1 },
      2: { players: 4, fails: 1 },
      3: { players: 4, fails: 1 },
      4: { players: 5, fails: 2 },
      5: { players: 5, fails: 1 }
    }
  },
  9: { resistance: 6, spies: 3,
    missions: {
      1: { players: 3, fails: 1 },
      2: { players: 4, fails: 1 },
      3: { players: 4, fails: 1 },
      4: { players: 5, fails: 2 },
      5: { players: 5, fails: 1 }
    }
  },
  10: { resistance: 6, spies: 4,
    missions: {
      1: { players: 3, fails: 1 },
      2: { players: 4, fails: 1 },
      3: { players: 4, fails: 1 },
      4: { players: 5, fails: 2 },
      5: { players: 5, fails: 1 }
    }
  }
};

class Game {
  constructor(client, players) {
    const numPlayers = this.numPlayers = players.length;

    this.client = client;
    this.players = players;
    this.schema = GAMES[numPlayers];
  }

  get gameOver() {
    return this.resistanceWins === 3 || this.spyWins === 3;
  }

  get roles() {
    return this.players.reduce((roles, player) => {
      roles[player.number] = player.role;

      return roles;
    }, {});
  }

  start(leaderPosition) {
    this.setup();
    this.setLeader((leaderPosition - 1) % this.numPlayers);
    this.enterMissionPhase();
  }

  setup() {
    const { resistance, spies, missions } = this.schema;

    this.missions = missions;
    this.numResistance = resistance;
    this.numSpies = spies;
    this.missionNumber = 1;
    this.resistanceWins = this.spyWins = 0;

    this.assignRoles();
  }

  assignRoles() {
    let roles = [];
    let { numResistance, numSpies } = this;

    while (numResistance--) { roles.push(0); }
    while (numSpies--) { roles.push(1); }

    roles = shuffle(roles);

    this.players.forEach((player, idx) => {
      const role = roles[idx] ? 'SPY' : 'RESISTANCE';

      player.role = role;

      this.push({
        name: 'SetRole',
        data: {
          playerNumber: idx,
          role
        }
      });
    });
    // assign images too

    this.push({ name: 'SpiesReveal' });
  }

  setLeader(position) {
    this.leaderPosition = position;
    this.leader = this.players[position];

    this.push({
      name: 'LeaderChange',
      data: { leaderPosition: position }
    });
  }

  enterMissionPhase() {
    this.failedVotes = this.receivedMissionCards = this.failCount = 0;
    this.mission = this.missions[this.missionNumber];
    this.enterTeamBuildingPhase();
  }

  enterTeamBuildingPhase() {
    this.receivedVotes = this.acceptCount = 0;

    this.moveLeaderToken();
    this.push({
      name: 'BuiltTeam',
      data: { numPlayers: this.mission.players }
    });
  }

  moveLeaderToken() {
    const newLeaderPosition = (this.leaderPosition + 1) % this.numPlayers;

    this.setLeader(newLeaderPosition);
  }

  setTeam(players) {
    const team = this.team = {};

    players.forEach(playerNumber => team[playerNumber] = this.players[playerNumber]);
  }

  recordVote(accept) {
    const voteCount = this.receivedVotes += 1;

    if (accept) {
      this.acceptCount += 1;
    }

    if (voteCount === this.numPlayers) {
      this.calculateVotingResults();
    }
  }

  calculateVotingResults() {
    const threshold = Math.ceil(this.numPlayers / 2);
    const accepted = this.acceptCount >= threshold;

    this.push({
      name: 'VotingResults',
      data: { accepted }
    });

    if (accepted) {
      this.push({
        name: 'ConductMission',
        data: { team: this.team }
      });
    } else {
      this.voteFailed();
    }
  }

  voteFailed() {
    const failedVotes = this.failedVotes += 1;

    if (failedVotes === 5) {
      this.push({
        name: 'GameOver',
        data: {
          winners: 'SPIES',
          roles: this.roles
        }
      });
    } else {
      this.enterTeamBuildingPhase();
    }
  }

  recordMissionCard(success) {
    const missionCardCount = this.receivedMissionCards += 1;

    if (!success) {
      this.failCount += 1;
    }

    if (missionCardCount === this.mission.players) {
      this.calculateMissionResults();
    }
  }

  calculateMissionResults() {
    let numFails = this.mission.fails;
    let numSuccesses = this.mission.players - numFails;
    let missionCards = [];
    const success = this.failCount < numFails;

    while (numFails-- > 0) {
      missionCards.push(0);
    }

    while (numSuccesses-- > 0) {
      missionCards.push(1);
    }

    missionCards = shuffle(missionCards);

    this.push({
      name: 'MissionResults',
      data: { success, missionCards }
    });

    if (success) {
      this.resistanceWins += 1;
    } else {
      this.spyWins += 1;
    }

    if (this.gameOver) {
      this.push({
        name: 'GameOver',
        data: {
          winners: this.resistanceWins > this.spyWins ? 'RESISTANCE' : 'SPIES',
          roles: this.roles
        }
      });
    } else {
      this.missionNumber += 1;
      this.enterMissionPhase();
    }
  }
}

export default Game;
