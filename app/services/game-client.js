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

    if (eventHandler) { eventHandler(data); }
  }

  push(event) {
    this.db.push(event);
  }

  signIn() {
    let id = Number(document.cookie);

    if (isNaN(id)) {
      document.cookie = id = this.id = this.players.length;

      this.push({
        name: 'PlayerSignIn',
        data: {
          id,
          name: prompt('Please enter your name')
        }
      });
    } else {
      this.id = id;
    }
  }

  onPlayerSignIn({ id, name }) {
    const players = this.players;

    if (players[id]) { return; }

    players.push(new Player(id, name));
    // add player icon / info to room display
  }

  onSetRole({ id, role }) {
    if (id !== this.id) { return; }
    // update player loyalty card
  }

  onSpiesReveal() {
    // display spies reveal phase for a while
  }

  onLeaderChange({ id }) {
    // move leader token
    // store id
    // highlight current mission
  }

  onBuildTeam({ numPlayers }) {
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

  onVotingResults({ accepted }) {
    // display each person's votes, hide after a while?
    // clear out stored votes?
  }

  onConductMission({ team }) {
    // if (!team[playerNo] || this.READ_ONLY) { return; }
    // display mission cards (clicking images, submit)
    // push MissionCardChosen event onSubmit
  }

  onMissionResults({ success, missionCards }) {
    // display mission cards face up
    // display resistance/spy win token
    // unhighlight team after a while
  }

  onGameStart({ numPlayers }) {
    // setup board
  }

  onGameOver({ winners, roles }) {
    // wait a bit, or maybe option to
    // display roles
  }
}
