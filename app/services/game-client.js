import Player from 'models/player';

export default class GameClient {
  constructor(url) {
    const db = this.db = new Firebase(url);

    this.players = [];

    db.once('value', snapshot => {
      this.init(snapshot.val());
      db.on('child_added', msg => this.handleEvent(msg.val()));
    });
  }

  init(events) {
    this.READ_ONLY = true;

    events.forEach(event => this.handleEvent(event));
    // READ_ONLY should be false for last event?

    this.READ_ONLY = false;
  }

  handleEvent({ name, data }) {
    const eventHandler = this[`on${name}`];

    eventHandler(data);
  }

  signIn() {
    let playerNumber = Number(document.cookie);

    if (isNaN(playerNumber)) {
      document.cookie = playerNumber = this.playerNumber = this.players.length;

      this.db.push({
        eventName: 'PlayerSignIn',
        data: {
          number: playerNumber,
          name: prompt('Please enter your name')
        }
      });
    } else {
      this.playerNumber = playerNumber;
    }
  }

  onPlayerSignIn({ number, name }) {
    const players = this.players;

    if (players[number]) { return; }

    players.push(new Player(number, name));
    // add player icon / info to room display
  }

  onSetRole({ number, role }) {
    if (number !== this.playerNumber) { return; }
    // update player loyalty card
  }

  onSpiesReveal() {
    // display spies reveal phase for a while
  }

  onLeaderChange({ leaderPosition }) {
    // move leader token
    // store leaderPosition
    // highlight current mission
  }

  onBuildTeam({ missionNo }) {
    // if leader !== currentPlayer || this.READ_ONLY { return; }
    // allow selection of team (clicking images, submit)
    // push TeamChosen event onSubmit
  }

  onTeamChosen({ team }) {
    // highlight team
  }

  onTeamVote() {
    // if (this.READ_ONLY) { return; }
    // display vote tokens (clicking images, submit)
    // push Vote event onSubmit
  }

  onVote({ player, accept }) {
    // record vote for revealing later
  }

  onVotingResults({ result }) {
    // display each person's votes, hide after a while?
    // clear out stored votes?
  }

  onConductMission({ team }) {
    // if (!team[playerNo] || this.READ_ONLY) { return; }
    // display mission cards (clicking images, submit)
    // push MissionCardChosen event onSubmit
  }

  onMissionResults({ result, missionCards }) {
    // display mission cards face up
    // display resistance/spy win token
    // unhighlight team after a while
  }

  onGameStart({ missions, numSpies, players, leaderPosition }) {
    // setup board
  }

  onGameOver({ winners, roles }) {
    // wait a bit, or maybe option to
    // display roles
  }
}
