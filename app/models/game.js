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
      roles[player.id] = {
        role: player.role,
        imageNumber: player.imageNumber
      };

      return roles;
    }, {});
  }

  start(leaderPosition) {
    this.setup();
    this.setLeader(leaderPosition % this.numPlayers);
    this.enterMissionPhase();
  }

  push(event) {
    this.client.push(event);
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
      let role;
      let imageNumber;

      if (roles[idx]) {
        role = 'spy';
        numSpies += 1;
        imageNumber = numSpies + 1;
      } else {
        role = 'resistance';
        numResistance += 1;
        imageNumber = numResistance + 1;
      }

      player.role = role;
      player.imageNumber = imageNumber;

      this.push({
        name: 'SetRole',
        data: {
          id: player.id,
          role,
          imageNumber
        }
      });
    });

    this.push({ name: 'SpiesHeadsUp' });
  }

  setLeader(position) {
    const leader = this.leader = this.players[position];

    this.leaderPosition = position;

    this.push({
      name: 'LeaderChange',
      data: { id: leader.id }
    });
  }

  enterMissionPhase() {
    this.failedVotes = this.receivedMissionCards = this.failCount = 0;
    this.mission = this.missions[this.missionNumber];
    this.enterTeamBuildingPhase();
  }

  enterTeamBuildingPhase() {
    this.receivedVotes = this.approveCount = 0;

    this.push({
      name: 'BuildTeam',
      data: { numPlayers: this.mission.players }
    });
  }

  moveLeaderToken() {
    const newLeaderPosition = (this.leaderPosition + 1) % this.numPlayers;

    this.setLeader(newLeaderPosition);
  }

  setTeam(players) {
    const team = this.team = {};

    players.forEach(id => team[id] = true);
  }

  recordVote(approve) {
    const voteCount = this.receivedVotes += 1;

    if (approve) {
      this.approveCount += 1;
    }

    if (voteCount === this.numPlayers) {
      this.calculateVotingResults();
    }
  }

  calculateVotingResults() {
    const threshold = Math.ceil(this.numPlayers / 2);
    const approved = this.approveCount >= threshold;

    this.push({
      name: 'VotingResults',
      data: { approved }
    });

    if (approved) {
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
          winners: 'spies',
          roles: this.roles
        }
      });
    } else {
      this.moveLeaderToken();
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
    const { players, fails } = this.mission;
    let numFails = this.failCount;
    let numSuccesses = players - numFails;
    let missionCards = [];
    const success = numFails < fails;

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
          winners: this.resistanceWins > this.spyWins ? 'resistance' : 'spies',
          roles: this.roles
        }
      });
    } else {
      this.missionNumber += 1;
      this.moveLeaderToken();
      this.enterMissionPhase();
    }
  }
}

export default Game;
