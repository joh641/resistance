// todo: separate player sign in events from game instance events
const USE_COOKIE = false;

import Player from 'models/player';

export default class GameClient {
  constructor(url) {
    const db = this.db = new Firebase(url);

    this.players = [];

    db.once('value', snapshot => {
      this.init(snapshot.val() || {});
      db.on('child_added', msg => this.handleEvent(msg.val()));
      this.signIn();
    });
  }

  init(events) {
    this.READ_ONLY = true;

    Object.keys(events).forEach(key => {
      this.handleEvent(events[key]);
    });
    // READ_ONLY should be false for last event?

    this.READ_ONLY = false;
  }

  handleEvent({ name, data }) {
    const eventHandler = this[`on${name}`];

    if (eventHandler) { eventHandler.call(this, data); }
  }

  push(event) {
    this.db.push(event);
  }

  signIn() {
    let id = Number(document.cookie || NaN);

    if (isNaN(id) || !USE_COOKIE) {
      document.cookie = id = this.id = this.players.length + 1;

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

    if (players[id - 1]) { return; }

    players.push(new Player(id, name));
  }

  onSetRole({ id, role, imageNumber }) {
    if (id !== this.id) { return; }

    const roleClass = `player__role--${role}`;
    const roleCardClass = `${roleClass}--${imageNumber}`;
    const roleCard = document.querySelector('.player--current .player__role');

    roleCard.classList.add(roleClass);
    roleCard.classList.add(roleCardClass);
    roleCard.classList.remove('player__role--face-down');
  }

  onSpiesHeadsUp() {
    // todo: display spies heads up phase for a while
  }

  onLeaderChange({ id }) {
    const oldLeader = this.leader;
    const token = '.player__leader-token';
    const hidden = 'player__leader-token--hidden';
    const newLeaderSelector = `.player--${id} ${token}`;

    if (oldLeader) {
      const oldLeaderSelector = `.player--${oldLeader} ${token}`;

      document.querySelector(oldLeaderSelector).classList.add(hidden);
    }

    document.querySelector(newLeaderSelector).classList.remove(hidden);

    this.leader = id;
    // todo: highlight current mission
  }

  onBuildTeam({ numPlayers }) {
    if (this.leader !== this.id || this.READ_ONLY) { return; }

    const selected = {};
    const panel = document.querySelector('.game__table__decision-panel');
    const submit = document.querySelector('.submit');
    const icons = document.querySelectorAll('.player__icon');
    let teamCount = 0;

    const onClick = e => {
      const target = e.target;

      if (target.classList.contains('player__icon--selected')) {
        target.classList.remove('player__icon--selected');
        selected[target.id] = false;
        teamCount--;
      } else {
        if (teamCount === numPlayers) { return; }

        target.classList.add('player__icon--selected');
        selected[target.id] = true;
        teamCount++;
      }

      if (teamCount === numPlayers) {
        submit.removeAttribute('disabled');
      } else {
        submit.setAttribute('disabled', 'true');
      }
    };

    [].forEach.call(icons, icon => {
      icon.addEventListener('click', onClick, false);
    });

    panel.classList.add('game__table__decision-panel--open');
    panel.classList.add('game__table__decision-panel--team');

    const onSubmit = () => {
      submit.removeEventListener('click', onSubmit, false);

      [].forEach.call(icons, icon => {
        icon.removeEventListener('click', onClick, false);
      });

      panel.classList.remove('game__table__decision-panel--open');
      panel.classList.remove('game__table__decision-panel--team');
      submit.setAttribute('disabled', 'true');

      this.push({
        name: 'TeamChosen',
        data: {
          team: Object.keys(selected).reduce((team, id) => {
            if (selected[id]) { team.push(id); }

            return team;
          }, [])
        }
      });

      const chosen = document.querySelectorAll('.player__icon--selected');

      [].forEach.call(chosen, icon => {
        icon.classList.remove('player__icon--selected');
      });
    };

    submit.addEventListener('click', onSubmit, false);
  }

  onTeamChosen({ team }) {
    const onTeam = 'player__icon--on-team';

    team.forEach(id => {
      const playerIcon = `.player--${id} .player__icon`;

      document.querySelector(playerIcon).classList.add(onTeam);
    });

    this.team = team;
  }

  onTeamVote() {
    if (this.READ_ONLY) { return; }

    this.votes = [];

    const panel = document.querySelector('.game__table__decision-panel');
    const submit = document.querySelector('.submit');
    const approveToken = document.querySelector('.vote-token--approve');
    const rejectToken = document.querySelector('.vote-token--reject');
    const onClick = e => {
      const prev = document.querySelector('.vote-token--selected');
      const target = e.target;

      if (prev && prev !== target) {
        prev.classList.remove('vote-token--selected');
      }

      target.classList.add('vote-token--selected');
      submit.removeAttribute('disabled');
    };

    approveToken.addEventListener('click', onClick, false);
    rejectToken.addEventListener('click', onClick, false);

    panel.classList.add('game__table__decision-panel--open');
    panel.classList.add('game__table__decision-panel--vote');

    const onSubmit = () => {
      submit.removeEventListener('click', onSubmit, false);
      approveToken.removeEventListener('click', onClick, false);
      rejectToken.removeEventListener('click', onClick, false);

      panel.classList.remove('game__table__decision-panel--open');
      panel.classList.remove('game__table__decision-panel--vote');
      submit.setAttribute('disabled', 'true');

      const selected = document.querySelector('.vote-token--selected');
      const approve = selected.classList.contains('vote-token--approve');

      selected.classList.remove('vote-token--selected');

      this.push({
        name: 'Vote',
        data: { approve, id: this.id }
      });
    };

    submit.addEventListener('click', onSubmit, false);
  }

  onVote(data) {
    this.votes.push(data);
  }

  onVotingResults({ approved }) {
    if (approved) {
      // todo: display approved message
      // todo: reset failed vote token
      // todo: team tokens
      this.team.forEach(id => {
        const playerClass = `.player--${id}`;
        const missionCardSelector = `${playerClass} .player__mission-card`;
        const hidden = 'player__mission-card--hidden';

        [].forEach.call(document.querySelectorAll(missionCardSelector), el => {
          el.classList.remove(hidden);
        });
      });
    } else {
      // todo: display rejected message
      // todo: move failed vote token

      const team = document.querySelectorAll('.player__icon--on-team');

      [].forEach.call(team, icon => {
        icon.classList.remove('player__icon--on-team');
      });

      this.team = [];
    }

    const revealedTokens = [];
    const faceDown = 'player__vote--face-down';

    this.votes.forEach(vote => {
      const player = `.player--${vote.id}`;
      const token = `.player__vote--${vote.approve ? 'approve' : 'reject'}`;
      const selected = document.querySelector(`${player} ${token}`);

      selected.classList.remove(faceDown);
      revealedTokens.push(selected);
    });

    this.votes = [];

    setTimeout(() => {
      revealedTokens.forEach(token => token.classList.add(faceDown));
    }, 10000);
  }

  onConductMission({ team }) {
    if (!team[this.id] || this.READ_ONLY) { return; }

    const panel = document.querySelector('.game__table__decision-panel');
    const submit = document.querySelector('.submit');
    const successCard = document.querySelector('.mission-card--success');
    const failCard = document.querySelector('.mission-card--fail');
    const onClick = e => {
      const prev = document.querySelector('.mission-card--selected');
      const target = e.target;

      if (prev && prev !== target) {
        prev.classList.remove('mission-card--selected');
      }

      target.classList.add('mission-card--selected');
      submit.removeAttribute('disabled');
    };

    successCard.addEventListener('click', onClick, false);
    failCard.addEventListener('click', onClick, false);

    panel.classList.add('game__table__decision-panel--open');
    panel.classList.add('game__table__decision-panel--mission');

    const onSubmit = () => {
      submit.removeEventListener('click', onSubmit, false);
      successCard.removeEventListener('click', onClick, false);
      failCard.removeEventListener('click', onClick, false);

      panel.classList.remove('game__table__decision-panel--open');
      panel.classList.remove('game__table__decision-panel--mission');
      submit.setAttribute('disabled', 'true');

      const selected = document.querySelector('.mission-card--selected');
      const success = selected.classList.contains('mission-card--success');

      selected.classList.remove('mission-card--selected');

      this.push({
        name: 'MissionCardChosen',
        data: { success }
      });
    };

    submit.addEventListener('click', onSubmit, false);
  }

  onMissionResults({ success, missionCards }) {
    const els = [];
    const message = document.querySelector('.message');

    missionCards.forEach(successCard => {
      const el = document.createElement('div');

      el.classList.add('mission-card');

      if (successCard) {
        el.classList.add('mission-card--success');
      } else {
        el.classList.add('mission-card--fail');
      }

      message.appendChild(el);
      els.push(el);
    });

    setTimeout(() => {
      els.forEach(el => {
        message.removeChild(el);
      });
    }, 10000);

    const wins = document.querySelector('.wins');
    const win = document.createElement('div');

    win.classList.add('win');

    if (success) {
      win.classList.add('win--resistance');
    } else {
      win.classList.add('win--spy');
    }

    wins.appendChild(win);

    const missionCardEls = document.querySelectorAll('.player__mission-card');

    [].forEach.call(missionCardEls, missionCard => {
      missionCard.classList.add('player__mission-card--hidden');
    });

    const team = document.querySelectorAll('.player__icon--on-team');

    [].forEach.call(team, icon => {
      icon.classList.remove('player__icon--on-team');
    });

    this.team = [];
  }

  onGameStart({ players, positions }) {
    // todo: setup board
    // todo: add player icon / info to room display
    const numPlayers = players.length;
    const gameClass = `game--${numPlayers}-players`;
    const offset = positions[this.id];

    players.forEach((player, idx) => {
      let position = idx - offset + 1;

      if (position < 1) { position += numPlayers; }

      const id = player.id;
      const playerClass = `player--${id}`;
      const seat = document.querySelector(`.player--position-${position}`);

      seat.classList.add(playerClass);
      seat.querySelector('.player__name').textContent = player.name;
      seat.querySelector('.player__icon').id = id;
    });

    document.querySelector('.game').classList.add(gameClass);
  }

  onGameOver({ winners, roles }) {
    // todo: display winners message

    this.players.forEach(player => {
      const id = player.id;
      const { role, imageNumber } = roles[id];
      const roleClass = `player__role--${role}`;
      const roleCardClass = `${roleClass}--${imageNumber}`;
      const roleCard = document.querySelector(`.player--${id} .player__role`);
      const faceDown = 'player__role--face-down';

      roleCard.classList.add(roleClass);
      roleCard.classList.add(roleCardClass);
      roleCard.classList.remove(faceDown);
    });
  }

  onGameEnd() {
    // l33t hacks, remove
    document.querySelector('.game').outerHTML = `
    <div class="game">
      <div class="player player--position-1 player--current">
        <div class="player__name"></div>
        <div class="player__icon"></div>
        <div class="player__role player__role--face-down"></div>
        <div class="player__vote player__vote--approve player__vote--face-down"></div>
        <div class="player__vote player__vote--reject player__vote--face-down"></div>
        <div class="player__leader-token player__leader-token--hidden"></div>
        <div class="player__mission-card player__mission-card--hidden"></div>
        <div class="player__mission-card player__mission-card--hidden"></div>
      </div>
      <div class="player player--position-2">
        <div class="player__name"></div>
        <div class="player__icon"></div>
        <div class="player__role player__role--face-down"></div>
        <div class="player__vote player__vote--approve player__vote--face-down"></div>
        <div class="player__vote player__vote--reject player__vote--face-down"></div>
        <div class="player__leader-token player__leader-token--hidden"></div>
        <div class="player__mission-card player__mission-card--hidden"></div>
        <div class="player__mission-card player__mission-card--hidden"></div>
      </div>
      <div class="player player--position-3">
        <div class="player__name"></div>
        <div class="player__icon"></div>
        <div class="player__role player__role--face-down"></div>
        <div class="player__vote player__vote--approve player__vote--face-down"></div>
        <div class="player__vote player__vote--reject player__vote--face-down"></div>
        <div class="player__leader-token player__leader-token--hidden"></div>
        <div class="player__mission-card player__mission-card--hidden"></div>
        <div class="player__mission-card player__mission-card--hidden"></div>
      </div>
      <div class="player player--position-4">
        <div class="player__name"></div>
        <div class="player__icon"></div>
        <div class="player__role player__role--face-down"></div>
        <div class="player__vote player__vote--approve player__vote--face-down"></div>
        <div class="player__vote player__vote--reject player__vote--face-down"></div>
        <div class="player__leader-token player__leader-token--hidden"></div>
        <div class="player__mission-card player__mission-card--hidden"></div>
        <div class="player__mission-card player__mission-card--hidden"></div>
      </div>
      <div class="player player--position-5">
        <div class="player__name"></div>
        <div class="player__icon"></div>
        <div class="player__role player__role--face-down"></div>
        <div class="player__vote player__vote--approve player__vote--face-down"></div>
        <div class="player__vote player__vote--reject player__vote--face-down"></div>
        <div class="player__leader-token player__leader-token--hidden"></div>
        <div class="player__mission-card player__mission-card--hidden"></div>
        <div class="player__mission-card player__mission-card--hidden"></div>
      </div>
      <div class="player player--position-6">
        <div class="player__name"></div>
        <div class="player__icon"></div>
        <div class="player__role player__role--face-down"></div>
        <div class="player__vote player__vote--approve player__vote--face-down"></div>
        <div class="player__vote player__vote--reject player__vote--face-down"></div>
        <div class="player__leader-token player__leader-token--hidden"></div>
        <div class="player__mission-card player__mission-card--hidden"></div>
        <div class="player__mission-card player__mission-card--hidden"></div>
      </div>
      <div class="player player--position-7">
        <div class="player__name"></div>
        <div class="player__icon"></div>
        <div class="player__role player__role--face-down"></div>
        <div class="player__vote player__vote--approve player__vote--face-down"></div>
        <div class="player__vote player__vote--reject player__vote--face-down"></div>
        <div class="player__leader-token player__leader-token--hidden"></div>
        <div class="player__mission-card player__mission-card--hidden"></div>
        <div class="player__mission-card player__mission-card--hidden"></div>
      </div>
      <div class="player player--position-8">
        <div class="player__name"></div>
        <div class="player__icon"></div>
        <div class="player__role player__role--face-down"></div>
        <div class="player__vote player__vote--approve player__vote--face-down"></div>
        <div class="player__vote player__vote--reject player__vote--face-down"></div>
        <div class="player__leader-token player__leader-token--hidden"></div>
        <div class="player__mission-card player__mission-card--hidden"></div>
        <div class="player__mission-card player__mission-card--hidden"></div>
      </div>
      <div class="player player--position-9">
        <div class="player__name"></div>
        <div class="player__icon"></div>
        <div class="player__role player__role--face-down"></div>
        <div class="player__vote player__vote--approve player__vote--face-down"></div>
        <div class="player__vote player__vote--reject player__vote--face-down"></div>
        <div class="player__leader-token player__leader-token--hidden"></div>
        <div class="player__mission-card player__mission-card--hidden"></div>
        <div class="player__mission-card player__mission-card--hidden"></div>
      </div>
      <div class="player player--position-10">
        <div class="player__name"></div>
        <div class="player__icon"></div>
        <div class="player__role player__role--face-down"></div>
        <div class="player__vote player__vote--approve player__vote--face-down"></div>
        <div class="player__vote player__vote--reject player__vote--face-down"></div>
        <div class="player__leader-token player__leader-token--hidden"></div>
        <div class="player__mission-card player__mission-card--hidden"></div>
        <div class="player__mission-card player__mission-card--hidden"></div>
      </div>
      <div class="game__area">
        <div class="game__table">
          <div class="game__table__top">
            <div class="game__table__top__display"></div>
          </div>
          <div class="game__table__middle">
            <div class="game__table__middle__strip"></div>
            <div class="game__board">
              <div class="game__board__panel"></div>
              <div class="game__board__results"></div>
            </div>
            <div class="display">
              <div class="message"></div>
              <div class="wins"></div>
            </div>
          </div>
          <div class="game__table__bottom">
            <div class="game__table__bottom__results"></div>
          </div>
        </div>
        <div class="game__table__decision-panel">
          <div class="team"></div>
          <div class="vote-tokens">
            <div class="vote-token vote-token--approve"></div>
            <div class="vote-token vote-token--reject"></div>
          </div>
          <div class="mission-cards">
            <div class="mission-card mission-card--success"></div>
            <div class="mission-card mission-card--fail"></div>
          </div>
          <button class="submit" disabled="true">Submit</button>
        </div>
      </div>
    </div>`.replace(/>\s+/g, '>');
  }
}
