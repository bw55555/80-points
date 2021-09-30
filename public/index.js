  /** @type {HTMLCanvasElement} */
window.user = prompt("Please enter your name.");

const C = document.getElementById("c");
C.width = 1450;
C.height = 720;
/** @type {CanvasRenderingContext2D} */
const X = C.getContext("2d");

const idtonum = [2,3,4,5,6,7,8,9,10,"J", "Q", "K", "A"]

//in hand
const cardTop = 550;
const cardLeft = 350;
const cardHInterval = 30;
const cardVInterval = 30;
const cardLength = 125;
const cardHeight = 167;

window.autodrawbutton = {
  "l": 200,
  "t": 550,
  "r": 300,
  "b": 580
}
window.autoplaybutton = {
  "l": 200,
  "t": 610,
  "r": 300,
  "b": 640
}
window.surrenderbutton = {
  "l": 200,
  "t": 670,
  "r": 300,
  "b": 700
}
window.drawbutton = {
  "l": 50,
  "t": 550,
  "r": 150,
  "b": 580
}
window.playbutton = {
  "l": 50,
  "t": 610,
  "r": 150,
  "b": 640
}
window.undobutton = {
  "l": 50,
  "t": 670,
  "r": 150,
  "b": 700
}


//in game
const cLength = 100;
const cHeight = 133;
const cInterval = 20;

let numids = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "jack", "queen", "king", "ace"];
let suitids = ["diamonds", "clubs", "hearts", "spades"];
let cardids = [];
for (let s = 0;s<4;s++) {
  for (let c = 0;c<13;c++) {
    cardids.push("/cards/"+numids[c]+suitids[s]);
    cardids.push("/cards/"+numids[c]+suitids[s]);
  }
}
cardids.push("/cards/JOS");
cardids.push("/cards/JOS");
cardids.push("/cards/JOB");
cardids.push("/cards/JOB");
cardids.push("/cards/back");


function initializeClient(initialGame, id, initialHand) {
  X.clearRect(0,0,c.width,c.height)
  window.deckDisplayed = false;
  window.trumpDisplayed = false;
  window.settings = {
    "autodraw": false,
    "autoplay": false,
    "surrender": false,
    "autoselect": false
  }
  settings.gm = settings.gm == true ? true : false
  if (user == "Brian") {settings.gm = true;}
  window.cardImageLoc = [];
  window.game = initialGame;
  window.player = new Player(id, initialHand);
  player.displayHand();
}


function forceRestart(turn, left, right) {
  if (turn > 3) {turn = turn % 4}
  if (left == undefined) {left = game.score[0]}
  if (right == undefined) {right = game.score[1]}
  socket.send(JSON.stringify({"request": "forceRestart", "info": {"turn":turn, "left":left, "right":right}}))
}

function sendGame() {
  socket.send(JSON.stringify({"game":game, "hand": player.hand, "username": user}));
}

function sendCards(username, cards) {
  socket.send(JSON.stringify({"request": "addCards", "info":{"username": username, "cards": cards}}))
}
connect();
window.afkTimer = null;
function connect() {
  window.socket = new WebSocket(location.href.replace("http", "ws"));
  console.log(location.href)
  socket.onclose = function(e) {
    console.log('Socket is closed. Reconnect will be attempted in 1 second.', e.reason);
    setTimeout(function() {
      connect();
    }, 1000);
  };

  socket.onerror = function(err) {
    console.error('Socket encountered error: ', err.message, 'Closing socket');
    socket.close();
  };
  
  socket.addEventListener("message", function(e) {
    let temp = JSON.parse(e.data)
    console.log(temp)
    if (temp.failmsg != undefined) {
      alert(temp.failmsg)
      return;
    }
    if (temp.getUsername == true) {
      if (user == "" || user == undefined) {return;}
      socket.send(JSON.stringify({"username":user, "getUsername":true}))
      return;
    }
    if (temp.onJoin != undefined) {
      initializeClient(temp.game,temp.onJoin,temp.hand)
      onClickCanvas();
    }
    game = temp.game;
    if (temp.request == "clearBoard") {
      clearBoard(temp.info);
    }
    if (temp.request == "addCards") {
      player.setHand = temp.hand;
    }
    if (temp.request == "forceRestart") {
      initializeClient(temp.game, player.getId, []);
    }
    if (temp.request == "setGM") {
      settings.gm = !settings.gm;
    }
    if (game.phase == "play") {
      player.displayHand();
    }
    
    if (settings.autodraw && canDraw()) {
      setTimeout(function() {if (settings.autodraw) {player.draw()}},500)
    }
    /*
    if (player.canPlay(true)) {
      clearTimeout(afkTimer)
      afkTimer = setTimeout(function() {
        if (player.canPlay(true)) {
          playSound()
        }
      }, 5000)
    } else {
      clearTimeout(afkTimer)
    }
    */
    if (game.phase == "play" && settings.autoplay && player.canPlay(true)) {
      setTimeout(function() {if (settings.autoplay) {player.autoplay()}},1000)
    }
    if (deckDisplayed == true && game.phase == "deck") {deckDisplayed = false;}
    if (deckDisplayed == false && game.phase == "play") {displayDeck();deckDisplayed = true;}
    if (game.phase == "end") {displayDeck();}
    displayButtons();
    displayGame();
  });
}
function surrender() {
  return alert("This feature is currently being tested")
  socket.send(JSON.stringify({"request": "surrender", "info": player.getId}))
  settings.surrender = !settings.surrender;
  displaySurrenderButton();
}

function processSurrender() {
  let winner = prompt("Who won?")
  while (game.players.indexOf(winner) == -1) {
    winner = prompt("Who won?")
  }
  let dm = parseInt(prompt("Deck multiplier?"))
  while (isNaN(dm) || dm < 2) {
    dm = parseInt(prompt("Deck multiplier?"))
  }
  socket.send(JSON.stringify({"request": "processSurrender", "info": {"winner": winner, "dm": dm}}))
}

function canDraw() {
  if (game.phase != "draw" && game.phase != "deck") {return false;}
  if (game.deck.length <= 8) {
    if (game.phase!= "deck" || player.id != game.first) {return false}
  } else if ((game.turn - player.id) % 4 != 0) {return false;}
  if (game.deck.length == 0) { return false; }
  return true;
}

function createButtonDisplay(loc, text, color, fontSize) {
  X.save();
  X.fillStyle = color
  X.fillRect(loc.l, loc.t, loc.r-loc.l, loc.b-loc.t);
  X.fillStyle = "white";
  X.font = fontSize+"px Arial";
  X.textAlign = "center"
  X.textBaseline = "middle"
  X.fillText(text, Math.floor(loc.l+(loc.r-loc.l)/2), Math.floor(loc.t+(loc.b-loc.t)/2));
  X.restore();

}
function displaySurrenderButton() {
  if (game.phase == "draw") {
    let color = "blue"
    if (game.first==game.turn || (game.first==-1 && game.turn == 0)) {color = "blue"}
    else {color = "red"}
    createButtonDisplay(surrenderbutton, "Cut Deck", color, 20)
  } else {
    let color = "red"
    if (settings.surrender) {color = "green"}
    if (game.phase != "play") {color = "red"}
    createButtonDisplay(surrenderbutton, "Surrender", color, 20)
  }
}
function displayAutoPlayButton() {
  let color = "blue"
  if (settings.autoplay) {color = "green"}
  if (game.phase != "play") {
    color = "red"
  }
  createButtonDisplay(autoplaybutton, "Autoplay", color, 20)
}
function displayAutoDrawButton() {
  if (game.phase == "draw" || game.phase == "deck") {
    let color = "blue"
    if (settings.autodraw) {color = "green"}
    createButtonDisplay(autodrawbutton, "Autodraw", color, 20)
  } else {
    let color = "blue"
    if (settings.autoselect) {color = "green"}
    createButtonDisplay(autodrawbutton, "Autoselect", color, 20)
  }
}

function displayDrawButton() {
  
  let tmp = checkNextButton() 
  if (tmp != false) {
    createButtonDisplay(drawbutton, "Next", tmp, 30)
  } else {
    let color = "blue";
    if (!canDraw()) {color = "red";}
    if (settings.autodraw) {color = "red";}
    createButtonDisplay(drawbutton, "Draw", color, 30)
  }
}

function displayTrump() {
  const trumpCardLoc = {"x":1000, "y": 50}
  if (trumpDisplayed) {return}
  trumpDisplayed = true
  X.save()
  X.font = "30px Arial"
  X.textAlign = "end";
  X.textBaseline = "middle";
  X.clearRect(trumpCardLoc.x-50,trumpCardLoc.y, trumpCardLoc.x, trumpCardLoc.y+cHeight)
  X.fillText(game.players[game.dpbpowner],trumpCardLoc.x-10,trumpCardLoc.y+Math.floor(cHeight/2))
  X.restore();
  loadCard(game.dpbp[0]).then((img) => {
    X.drawImage(img, trumpCardLoc.x, trumpCardLoc.y, cLength, cHeight);
  }).catch((err) => {
    console.error(err);
  });
  player.clearSelection();
  player.displayHand();
}

async function clearBoard(info) {
  player.clearSelection();
  if (game.phase == "deck") {
    player.addCards(info[player.getId]);
    //add trump cards to righthand corner
    displayTrump()
  }
  if (game.phase == "play" || game.phase == "end") {
    displayPoints();
  }
  if (info.end == true) {
    initializeClient(game,player.getId,[])
    displayButtons();
  }
}

function displayPlayButton() {
  let color = "blue";
  if (!player.canPlay()) {color = "red"}
  createButtonDisplay(playbutton, "Play", color, 30)
}

function displayUndoButton() {
  let color = "blue";
  if ((game.turn +3) % 4 != player.getId || game.plays[player.getId].length == 0) {color = "red"}
  createButtonDisplay(undobutton, "Undo", color, 30)
}

function displayDeck() {
  const deckLoc = {"x": 1000, "y": 210}
  let toDisplay = [108,108,108,108,108,108,108,108];
  if (game.deckOwner == player.id || game.phase == "end") {
    toDisplay = game.deck;
  }
  X.save()
    X.font = "30px Arial"
    X.textAlign = "end";
    X.textBaseline = "middle";
    X.clearRect(deckLoc.x-50,deckLoc.y, deckLoc.x, deckLoc.y+cHeight)
    X.fillText(game.players[game.deckOwner],deckLoc.x-10,deckLoc.y+Math.floor(cHeight/2))
  X.restore();
  Promise.all(toDisplay.map(i => loadCard(i))).then((images) => {
      for (let i = 0;i<images.length;i++) {
        X.drawImage(images[i], deckLoc.x+cInterval*i, deckLoc.y, cLength,cHeight);
      }
  }).catch((err) => {
    console.error(err);
  });
}
const pointvals = [0,0,0,5,0,0,0,0,10,0,0,10,0,0,0]
function displayPoints() {
  let ptsum = game.points.reduce((pts,cid) => pts+pointvals[num(cid)],0)
  
  const pointsLoc = {"x": 1000, "y": 370}
  X.save()
  X.font = "30px Arial"
  X.textAlign = "end";
  X.textBaseline = "middle";
  X.clearRect(pointsLoc.x-50,pointsLoc.y, pointsLoc.x, pointsLoc.y+cHeight)
  X.fillText(ptsum,pointsLoc.x-10,pointsLoc.y+Math.floor(cHeight/2))
  X.restore();
  Promise.all(game.points.map(i => loadCard(i))).then((images) => {
      for (let i = 0;i<images.length;i++) {
        X.drawImage(images[i], pointsLoc.x+cInterval*i, pointsLoc.y, cLength,cHeight);
      }
  }).catch((err) => {
    console.error(err);
  });
}

function displayButtons() {
  displayDrawButton();
  displayPlayButton();
  displayUndoButton();
  displayAutoDrawButton();
  displayAutoPlayButton();
  displaySurrenderButton();
}

function checkNextButton() {
  
  if (game.phase == "draw") {
    if (settings.gm != true) {return false}
    if (game.deck.length > 8) {return false;}
    if (game.dpbp.length == 0) {return "red";}
    return "green";
  }
  if (game.phase == "deck") {
    if (settings.gm != true) {return false}
    if (game.first == player.getId) {return false}
    return "red";
  }
  if (game.phase == "play") {
    if (game.deckOwner != player.getId) {return false;}
    let last = (game.first +3) % 4
    if (game.plays[last].length == 0) { 
      return "red";
    } 
    return "green";
  }
  if (game.phase == "end") {
    return "green";
  }
}

function onClickCanvas() {
  c.addEventListener('click', function(e) {
    //console.log(e);
    if (e.offsetX<=drawbutton.r && e.offsetX>=drawbutton.l && e.offsetY>=drawbutton.t && e.offsetY<=drawbutton.b) {
      let tmp = checkNextButton()
      if (tmp != false) {
        if (tmp == "red") {return alert("You cannot use this button yet!")}
        if (game.phase == "draw") {
          let cancontinue = prompt("Do you really wish to do this?")
          if (cancontinue == "" || cancontinue == "no" || cancontinue == undefined) {return;}
        }
        socket.send(JSON.stringify({"request":"clearBoard"}))
      } else {
        if (settings.autodraw) {return alert("Autodraw is currently on!")}
        player.draw();
      }
    } else if (e.offsetX<=playbutton.r && e.offsetX>=playbutton.l && e.offsetY>=playbutton.t && e.offsetY<=playbutton.b) {
      player.play();
    } else if (e.offsetX<=undobutton.r && e.offsetX>=undobutton.l && e.offsetY>=undobutton.t && e.offsetY<=undobutton.b) {
      player.undo();
    } else if (e.offsetX<=autoplaybutton.r && e.offsetX>=autoplaybutton.l && e.offsetY>=autoplaybutton.t && e.offsetY<=autoplaybutton.b) {
      if (game.phase == "play") {
        settings.autoplay = !settings.autoplay
        if (settings.autoplay && player.canPlay(true)) {
          player.autoplay();
        }
        displayButtons();
      }
    } else if (e.offsetX<=autodrawbutton.r && e.offsetX>=autodrawbutton.l && e.offsetY>=autodrawbutton.t && e.offsetY<=autodrawbutton.b) {
      if (game.phase == "draw" || game.phase == "deck") {
        settings.autodraw = !settings.autodraw;
        if (settings.autodraw && canDraw()) {
          player.draw();
        }
        displayButtons();
      } else if (game.phase == "play") {
        settings.autoselect = !settings.autoselect;
        displayButtons();
      }
    } else if (e.offsetX<=surrenderbutton.r && e.offsetX>=surrenderbutton.l && e.offsetY>=surrenderbutton.t && e.offsetY<=surrenderbutton.b) {
      if (game.phase == "draw") {cutDeck()}
      else if (game.phase == "play") {surrender()}
    } else if (e.offsetX > cardLeft && e.offsetY > cardTop-cardVInterval) {
      for (let i = cardImageLoc.length-1;i>=0;i--) {
        if (e.offsetX >= cardImageLoc[i].x && e.offsetX <= cardImageLoc[i].x+cardLength && e.offsetY >= cardImageLoc[i].y && e.offsetY <= cardImageLoc[i].y + cardHeight) {
          if (cardImageLoc[i].s) {
            player.select(i);
          }
          return;
        }
      }
    } else {return}
    console.log({"player":player.toJSON(), "game": game})
  }, false);
}

async function displayGame() {
  const tP = 0; //textpadding
  const tlcx = 200; //topLeftCorner x
  const tlcy = 150; //topLeftCorner y
  const sl = 200; //length of square
  const rightSide = {"l": tlcy, "r":tlcy+sl, "t":tlcx+sl}
  const downSide = {"l": tlcx, "r": tlcx+sl, "t": tlcy+sl}
  const leftSide = {"l": tlcy, "r": tlcy+sl, "t":tlcx-cHeight}
  const upSide = {"l": tlcx, "r": tlcx+sl, "t":tlcy-cHeight}
  X.clearRect(0, 0, tlcx+sl+cHeight+20, tlcy+sl+cHeight+20);
  let currid = 0;
  let start = 0;
  let diff = (4+ game.turn - player.getId) % 4
  if (game.phase == "draw") {
    X.save()
    X.font = "30px Arial"
    X.textAlign = "center";
    X.textBaseline = "middle";
    let pos = (4+ game.deckOwner - player.getId) % 4
    let extraX = 0;
    let extraY = 0;
    if (game.deckOwner == -1) {}
    else if (pos == 0) {extraY = 50;}
    else if (pos == 1) {extraX = 50;}
    else if (pos == 2) {extraY = -50;}
    else if (pos == 3) {extraX = -50;}
    X.fillText(idtonum[game.trump],Math.floor(tlcx+sl/2)+extraX,Math.floor(tlcy+sl/2)+extraY)
    X.restore();
  }
  X.fillStyle = "yellow";
  if (diff == 0) {
    X.fillRect(downSide.l, downSide.t+cHeight, downSide.r-downSide.l,15)
  } else if (diff == 1) {
    X.fillRect(rightSide.t+cHeight, rightSide.l, 15,rightSide.r-rightSide.l)
  } else if (diff == 2) {
    X.fillRect(upSide.l, upSide.t-15, upSide.r-upSide.l,15)
  } else if (diff == 3) {
    X.fillRect(leftSide.t-15, leftSide.l, 15,leftSide.r-leftSide.l)
  }
  X.fillStyle = "black";
  currid = (player.getId+1) %4;
  X.save();
  X.textAlign = "center"
  X.font = "15px Arial"
  X.textBaseline = "bottom"
  X.translate(rightSide.t+cHeight+tP, rightSide.l + Math.floor((rightSide.r - rightSide.l)/2) );
  X.rotate(Math.PI/2);
  X.fillText(game.players[currid], 0,0)
  X.restore();
  
  start = rightSide.l + Math.floor((rightSide.r - rightSide.l - (game.plays[currid].length-1)*cInterval - cLength)/2);
  await Promise.all(game.plays[currid].map(i => loadCard(i))).then((images) => {
    X.save();
    X.translate(rightSide.t, start);
    X.rotate(Math.PI/2);
    for (let i = 0;i<images.length;i++) {
      X.drawImage(images[i], cInterval*i, -cHeight, cLength, cHeight);
    }
    
    X.restore();
  }).catch((err) => {
      console.error(err);
  });

  currid = (player.getId+3) %4;
  X.save();
  X.textAlign = "center"
  X.font = "15px Arial"
  X.textBaseline = "top"
  X.translate(leftSide.t-tP-15, leftSide.l + Math.floor((leftSide.r - leftSide.l)/2));
  X.rotate(3*Math.PI/2);
  X.fillText(game.players[currid], 0,0)
  X.restore();

  start = leftSide.l + Math.floor((leftSide.r - leftSide.l - ((game.plays[currid].length-1)*cInterval) + cLength)/2);
  await Promise.all(game.plays[currid].map(i => loadCard(i))).then((images) => {
    X.save();
    X.translate(leftSide.t, start);
    X.rotate(3*Math.PI/2);
    for (let i = images.length-1;i>=0;i--) {
      X.drawImage(images[i], -cInterval*i, 0, cLength, cHeight);
    }
    X.restore();
  }).catch((err) => {
      console.error(err);
  });

  currid = player.getId;
  X.save();
  X.textAlign = "center"
  X.font = "15px Arial"
  X.textBaseline = "top"
  X.translate(downSide.l + Math.floor((downSide.r - downSide.l)/2),downSide.t+cHeight+tP);
  X.fillText(game.players[currid], 0,0)
  X.restore();

  start = downSide.l + Math.floor((downSide.r - downSide.l - (game.plays[currid].length-1)*cInterval - cLength)/2);
  await Promise.all(game.plays[currid].map(i => loadCard(i))).then((images) => {
      for (let i = 0;i<images.length;i++) {
        X.drawImage(images[i], start+cInterval*i, downSide.t, cLength, cHeight);
      }
  }).catch((err) => {
    console.error(err);
  });

  currid = (player.getId+2) %4;
  
  X.save();
  X.textAlign = "center"
  X.font = "15px Arial"
  X.textBaseline = "bottom"
  X.translate(upSide.l + Math.floor((upSide.r - upSide.l)/2),upSide.t-tP);
  X.fillText(game.players[currid], 0,0)
  X.restore();

  start = upSide.l + Math.floor((upSide.r - upSide.l - (game.plays[currid].length-1)*cInterval - cLength)/2);
  await Promise.all(game.plays[currid].map(i => loadCard(i))).then((images) => {
      for (let i = 0;i<images.length;i++) {
        X.drawImage(images[i], start+cInterval*i, upSide.t, cLength, cHeight);
      }
  }).catch((err) => {
    console.error(err);
  });
}


function cutDeck() {
  if (!(game.phase == "draw" && (game.first==game.turn || (game.first==-1 && game.turn == 0)))) {return alert("You cannot do this right now!")}
  let numCards = prompt("How many cards do you want to cut? enter a number between 1 and 107 or -1 for random. ") 
  if (numCards == "" || numCards == undefined) {return}
  numCards = parseInt(numCards)
  if (!isNaN(numCards) && numCards != -1 && (numCards < 1 || numCards > 107)) {
    return alert("This is not a valid number!")
  }
  if (!(game.phase == "draw" && (game.first==game.turn || (game.first==-1 && game.turn == 0)))) {return alert("You cannot do this right now!")}
  if (numCards == -1) {numCards=1+Math.floor((game.deck.length-1)*Math.random())}
  let removed = game.deck.splice(0,numCards)
  game.deck = game.deck.concat(removed)
  sendGame();
}

class Player {
  constructor(cid, init) {
    this.hand = [];
    this.id = cid;
    this.selection = [];
    if (init != undefined) {
      this.hand = init;
    }
  }

  toJSON() {
    return {"hand":this.hand, "id": this.id, "selection": this.selection}
  }

  undo() {
    if (this.hand.length == 25 && this.id == game.first) {
      this.hand = this.hand.concat(game.deck);
      game.deck = [];
      game.phase = "deck";
      this.clearSelection();
      this.displayHand();
      sendGame();
      return;
    }
    if ((game.turn + 3) % 4 != this.id || game.plays[player.getId].length == 0) {return alert("You cannot undo right now!")}
    this.addCards(game.plays[this.id])
    game.plays[this.id] = [];
    game.turn = (game.turn+3)%4
    this.clearSelection();
    this.displayHand();
    sendGame();
  }

  addCards(cards) {
    this.hand = this.hand.concat(cards);
  }

  autoplay() {
    this.clearSelection();
    if (game.first == this.id) {this.selection.push(this.hand[this.hand.length-1])}
    else {
      let rem = game.plays[game.first].length
      let copyHand = this.hand.filter(c=>true);
      let copyPlay = game.plays[game.first].filter(c=>true);
      while (rem > 0) {
        let remhP = findHighestPriority(copyPlay, rem)
        let hP = findHighestPriority(copyHand, remhP.length)
        rem-=hP.length
        this.selection = this.selection.concat(hP)
        copyHand = copyHand.filter(c=> hP.indexOf(c) == -1);
      }
    }
    player.play()
  }

  canPlay(isAuto) {
    isAuto = isAuto==true ? true : false;
    if (this.selection.length == 0 && !isAuto) {return false;}
    if (!this.isValid() && !isAuto) {return false;}
    if (game.phase == "draw" && (settings.autodraw || ((game.turn - this.id) % 4 != 0 && game.deck.length != 8))) {return false;}
    if (game.phase == "play" && ((game.turn - this.id) % 4 != 0 || game.plays[this.id].length >0)) {return false;}
    return true;
  }

  play() {
    if (this.selection.length == 0) {return alert("You have not selected any cards yet!")}
    if (!this.isValid()) {return alert("This selection is not valid!")}
    if (game.first == -1) {game.first = player.id;}
    if (game.deckOwner == -1) {game.deckOwner = player.id;}
    if (game.phase == "draw") {
      if (settings.autodraw) {return alert("Due to concurrency issues, you cannot play cards while autodraw is on.")}
      if ((game.turn - this.id) % 4 != 0 && game.deck.length != 8) {return alert("Due to concurrency issues, you can only play a card on your turn. ")}
      if (this.selection[0] > 103) {
        this.hand = this.hand.concat(game.plays[this.id]);
        game.plays[this.id] = this.selection;
      }
      else {
        game.plays[this.id] = game.plays[this.id].concat(this.selection);
      }
      game.dpbp = game.plays[this.id];
      game.dpbpowner = this.id
    }
    else if (game.phase == "deck") {
      game.deck = this.selection;
      game.phase = "play";
      game.turn = game.first;
    }
    else if (game.phase == "play") {
      if ((game.turn - this.id) % 4 != 0) {return alert("It is not your turn!")}
      if (game.plays[this.id].length >0) {return alert("It is not your turn!")}
      game.plays[this.id] = this.selection;
      if (game.first == this.id) {getValues();}
      if ((this.id + 1) % 4 == game.first && this.hand.length - this.selection.length == 0) {game.lastTurn = true;}
      game.turn++;
    }
    for (let i = 0;i<this.selection.length;i++) {
      this.hand.splice(this.hand.indexOf(this.selection[i]),1)
    }
    this.clearSelection();
    this.displayHand();
    sendGame();
  }

  isValid() {
    if (game.phase == "draw") {
      if (this.selection.length == 1) {
        if (this.selection[0] > 103) {return false;}
        if (game.plays[this.id].length == 1) {
          if (gcn(game.plays[this.id][0]) == gcn(this.selection[0])) {
            if (game.dpbp[0] >= 104) {return false;}
            return true;
          }
          return false;
        }
        if (game.dpbp.length >= 1) {return false;}
        return true;
      }
      if (this.selection.length == 2) {
        if (game.dpbp.length != 2) { return true; }
        if (this.selection[0] > 103 && game.dpbp[0] < this.selection[0]) {return true;}
        return false;
      }
      return false;
    }
    if (game.phase == "deck") {
      return game.deck.length == 0 && this.selection.length == 8;
    }
    if (game.phase == "play") {
      if (game.first == this.id) {
        return true;
      }
      if (game.plays[game.first].length != this.selection.length) {
        return false;
      }
      let copyPlay = game.plays[game.first].filter(c => true)
      let copyHand = this.hand.filter(c => true)
      let copySelection = this.selection.filter(c => true)
      while (copyPlay.length > 0) {
        let highestPriority = findHighestPriority(copyPlay)
        copyPlay = copyPlay.filter(c=> highestPriority.indexOf(c) == -1);
        let handHP = findHighestPriority(copyHand, highestPriority.length);
        let selectedHP = findHighestPriority(copySelection, highestPriority.length);
        if (selectedHP.length == highestPriority.length) {
          copyHand = copyHand.filter(c=> selectedHP.indexOf(c) == -1)
          copySelection = copySelection.filter(c=> selectedHP.indexOf(c) == -1)
        }
        else if (handHP.length <= highestPriority.length && selectedHP.length < highestPriority.length && selectedHP.length < handHP.length) {
          return false;
        } else {
          let rem = highestPriority.length;
          rem-=selectedHP.length;
          copyHand = copyHand.filter( c => selectedHP.indexOf(c) == -1)
          copySelection = copySelection.filter(c=> selectedHP.indexOf(c) == -1)
          while (rem > 0) {
            selectedHP = findHighestPriority(copySelection, rem);
            handHP = findHighestPriority(copyHand, rem);
            if (handHP.length <= rem && selectedHP.length < rem && selectedHP.length < handHP.length) {
              return false;
            }
            rem-=selectedHP.length;
            copyHand = copyHand.filter( c => selectedHP.indexOf(c) == -1)
            copySelection = copySelection.filter(c=> selectedHP.indexOf(c) == -1)
          }
        }
      }
      return true;
    }
  }

  draw() {
    /*
    if (game.phase != "draw" && game.phase != "deck") { return alert("There are no cards left in the deck!"); }
    if (game.deck.length <= 8) {
      if (game.phase != "deck" || this.id != game.first) {return alert("It is not your turn right now!")}
    } else if ((game.turn - this.id) % 4 != 0) {return alert("It is not your turn right now!")}
    if (game.deck.length == 0) { return alert("There are no cards left in the deck!"); }
    */
    if (!canDraw()) { return alert("You cannot do this right now!")}
    this.hand.push(game.deck.splice(Math.floor(Math.random()*game.deck.length),1)[0]);
    if (game.deck.length < 8) {game.phase = "deck";}
    else {
      game.turn++;
    }
    this.displayHand();
    sendGame();
  }

  get getId() {
    return this.id;
  }

  get getSelection() {
    return this.selection;
  }

  set setSelection(s) {
    this.selection = s;
  }  

  clearSelection() {
    this.selection = [];
  }

  set setHand(h) {
    this.hand = h;
    this.displayHand();
  }

  get getHand() {
    return this.hand;
  }
  
  select(index) {
    let cardnum = this.hand[index];
    if (this.selection.indexOf(cardnum) != -1) {this.selection.splice(this.selection.indexOf(cardnum),1)}
    else {this.selection.push(cardnum);}
    this.displayHand()
  }

  hasCard(id) {
    return this.hand.indexOf(id) != -1;
  }
  
  possibleCards() {
    let possible = [];
    let fieldCards = game.plays[this.id].concat(this.selection)
    if (game.phase == "draw") {
      if (this.selection.find(c => c >= 104) != undefined) {
        return possible.concat(this.hand.filter(c => gcn(c) == gcn(this.selection.find(d => d >= 104))))
      } else if (this.selection.find(c => c < 104) == undefined) {
        if (this.hasCard(104) && this.hasCard(105)) {possible.push(104);possible.push(105)}
        if (this.hasCard(106) && this.hasCard(107)) {possible.push(106);possible.push(107)}
      }
      if (fieldCards.length >= 2) {}
      else if (fieldCards.length == 1) {
        possible = possible.concat(this.hand.filter(c => (gcn(c) == gcn((fieldCards[0])))))
      } else {
        possible = possible.concat(this.hand.filter(c => (num(c) == game.trump)))
      }
      return possible;
    }
    else if (game.phase == "deck") {
      if (game.first == this.id && this.selection.length <8) {
        return this.hand;
      }
    }
    else if (game.phase == "play") {
      if (this.id == game.first) {
        if (this.selection.length == 0) {return this.hand;}
        return this.hand.filter(c=> suit(c) == suit(this.selection[0]));
      } else {
        if (game.plays[game.first].length == 0) {return []}
        if (game.plays[game.first].length <= this.selection.length) {return [];}
        if (game.plays[this.id].length > 0) {return [];}
        let nonSelected = this.hand.filter(c=> this.selection.indexOf(c) == -1);
        let correctSuit = nonSelected.filter(c => suit(c) == getDsuit())
        if (correctSuit.length == 0) {
          return this.hand;
        }
        else {
          return correctSuit;
        }
      }
    }
    return [];
  }

  autoselect(possible) {
    if (game.phase != "play") {return false;}
    if (this.selection.length != 0) {return false;}
    if (game.first == this.id || ((game.first +1) % 4 )== game.turn) {return false;}
    if (game.plays[game.first].length == 0) {return false;}
    if (possible == undefined) {possible = this.possibleCards()}
    /*
    let playpriority = findPriority(game.plays[game.first])
    let selectpossible = findPriority(possible, playpriority[0].length)
    
    let rem = game.plays[game.first].length
    let copyHand = this.hand.filter(c=>true);
    while (rem > 0) {
      let hP = findHighestPriority(copyHand, rem)
      if (hP)
      rem-=hP.length
      this.selection = this.selection.concat(hP)
      copyHand = copyHand.filter(c=> hP.indexOf(c) == -1);
    }
    */
  }

  displayHand() {
    this.hand.sort(compareCards).filter((x,i)=> this.hand.indexOf(x) == i)

    X.clearRect(cardLeft, cardTop-cardVInterval, cardLeft+cardHInterval*(33)+75, cardTop+100);
    X.fillStyle = "#000000";
    let canSelect = this.possibleCards();
    if (settings.autoselect) { this.autoselect(canSelect) }
    Promise.all(this.hand.map(i => loadCard(i, this.selection.indexOf(i)))).then((images) => {
      cardImageLoc = [];
      for (let i = 0;i<images.length;i++) {
        let y = cardTop;
        let s = false;
        if (this.selection.indexOf(this.hand[i]) != -1 || canSelect.indexOf(this.hand[i]) != -1) {y = cardTop-cardVInterval;s = true;}
        cardImageLoc.push({"x": cardLeft+cardHInterval*i, "y": y, "s":s})
        X.drawImage(images[i], cardLeft+cardHInterval*i, y, cardLength, cardHeight);
      }
    }).catch((err) => {
        console.error(err);
    });
    displayButtons()
  }
}
function pairId(id) {
  if (id % 2 == 0) {return id+1;} else {return id-1;}
}

function findPairs(cards) {
  return cards.filter(c=>cards.indexOf(pairId(c)) != -1);
}

function adj(id) {
  return game.values.map((v,i)=> {if (v == game.values[id]-1 || v== game.values[id]+1) {return i}} ).filter(v => v!==undefined)
}

function findCPairs(cards) {
  let pairs = findPairs(cards);
  return pairs.filter(function(c) {
    let adjarr = adj(c)
    for (let i of adjarr) {
      if (pairs.indexOf(i) != -1) {
        return true
      }
    }
    return false
  })
}

function getDsuit() {
  return suit(game.plays[game.first][0])
}

function setGM(username) {
  socket.send(JSON.stringify({"request": "setGM", "info":{"username": username}}))
}

function getValues() {
  game.values = [];
  let truetrump = game.tsuit == -1 ? 0 : 1
  for (let i = 0;i<104;i++) {
    if (suit(i) === game.tsuit) {
      if (num(i) < game.trump) {
        game.values.push(100+num(i));
      } else if (num(i) > game.trump) {
        game.values.push(100+num(i)-1);
      } else if (truesuit(i) === game.tsuit){
        game.values.push(112+truetrump)
      } else {
        game.values.push(112);
      }
    }
    else if (suit(i) === getDsuit()) {
      if (num(i) < game.trump) {
        game.values.push(num(i));
      } else {
        game.values.push(num(i)-1);
      }
    } 
    else {
      game.values.push(-2)
    }
  }
  game.values.push(113+truetrump,113+truetrump,114+truetrump,114+truetrump)
}

function findHighestPriority(cards, maxPriority) {
  let allowTrump = getDsuit() == game.tsuit ? 100 : 0
  if (cards.length == 0) {return []}
  if (maxPriority == undefined) {maxPriority = 33;}
  let cPairs = findCPairs(cards).sort(valueCompare).filter(c=>game.values[c] >= 0 && game.values[c] < 100+allowTrump);
  if (cPairs.length == 0 || maxPriority <= 2) {
    let pairs = findPairs(cards).filter(c=>game.values[c] >= 0 && game.values[c] < 100+allowTrump);
    if (pairs.length == 0 || maxPriority == 1) {
      let singles = cards.filter(c=>true);
      singles = singles.filter(c=>game.values[c] >= 0 && game.values[c] < 100+allowTrump).sort(valueCompare)
      if (singles.length == 0) {return [cards[cards.length-1]]}
      return [singles[singles.length-1]]
    }
    return [pairs[pairs.length-2],pairs[pairs.length-1]]
  }
  cPairs.reverse();
  let maxLength = 0;
  let maxIndex = 0;
  let currLength = 2;
  let currIndex = 0;
  let currValue = game.values[cPairs[0]];
  for (let i = 2;i<cPairs.length;i+=2) {
    if (currValue == game.values[cPairs[i]] + 1 || currLength == maxPriority) {
      currLength += 2;
    }
    else {
      if (currLength > maxLength) {
        maxLength = currLength
        maxIndex = currIndex;
      }
      currLength = 2;
      currIndex = i;
    }
    if (currLength > maxLength) {
      maxLength = currLength
      maxIndex = currIndex;
    }
    currValue = game.values[cPairs[i]]
  }
  return cPairs.splice(maxIndex, maxLength).reverse();
}

function findPriority(cards, priority) {
  let copyCards = cards.filter(x=> true)
  let hP = findHighestPriority(cards, priority)
  if (priority == undefined) {priority = hP.length}
  let possible = [];
  while (hP.length == priority) {
    copyCards = copyCards.filter(x=> hP.indexOf(x) == -1) 
    possible = possible.concat(hP)
    hP = findHighestPriority(cards, priority)
  }
  return possible;
}

function valueCompare(a,b) {
  return game.values[a]-game.values[b];
}

function compareCards(a,b) {
  let tn = game.trump;
  let ts = game.tsuit;
  if (a>=104 && b>=104) {return a-b;}
  else if (a>=104) {return 1;}
  else if (b>=104) {return -1;}
  else if (Math.floor(a/2) %13 == tn && Math.floor(b/2) %13 == tn) {
    if (truesuit(a) == game.tsuit && truesuit(b) == game.tsuit) {return a-b;}
    if (truesuit(a) == game.tsuit) {return 1;}
    else if (truesuit(b) == game.tsuit) {return -1;}
    else {return a-b;}
  }
  else if (Math.floor(a/2) %13 == tn) {return 1;}
  else if (Math.floor(b/2) %13 == tn) {return -1;}
  else if (Math.floor(a/26) === ts && Math.floor(b/26) === ts) {return a-b;}
  else if (Math.floor(a/26) === ts) {return 1;}
  else if (Math.floor(b/26) === ts) {return -1;}
  else {return a-b;}
}

function gcn(id) {
  return Math.floor(id/2)
}

function num(id) {
  if (id >= 106) {return 14;}
  if (id >= 104) {return 13;}
  return gcn(id) % 13;
}

function suit(id) {
  if (id >= 104) {return game.tsuit;}
  if (num(id) == game.trump) {return game.tsuit}
  return (gcn(id)-num(id))/13
}

function truesuit(id) {
  if (id >= 104) {return game.tsuit;}
  return (gcn(id)-num(id))/13
}

function loadCard(id, s) {
  s = (s === undefined || s === "" || s === -1) ? "" : "S"
  return new Promise((resolve, reject) => {
    let image = new Image;
    image.addEventListener("load", () => {
        resolve(image);
    });
    image.addEventListener("error", (err) => {
        reject(err);
    });
    image.src = cardids[id]+s+".GIF";
  });
}

function autodraw25() {
  for (var i = 0;i<25;i++) {
    player.draw();
    game.turn-=1;
  }
}

function spliceArray(a1,a2) {
  return a1.filter(item => a2.indexOf(item) == -1)
}

function saveAsFile(filename) {
  if (filename == undefined) {filename = "saveGame"}
  socket.send(JSON.stringify({"request": "saveAsFile", "info": filename}))
}


function playSound() {
  new Audio("https://80-points--bw55555.repl.co/pse.mp3").play();
}

/*
FS.writeFile('record/'+user+'Log.txt', "fileCreated", function (err) {
  if (err) throw err;
  console.log('Saved!');
});
window.wstream = FS.createWriteStream('/record/'+user+'Log.txt')
function record(msg) {
  wstream.write(msg)
}
*/