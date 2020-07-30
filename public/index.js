/** @type {HTMLCanvasElement} */

window.user = prompt("Please enter your name.");
initializeClient({})
function initializeClient(initialGame) {
  window.deckDisplayed = false;
  window.settings = {
    "autodraw": false
  }
  window.cardImageLoc = [];
  window.game = initialGame;
  window.player = null;
}

const socket = new WebSocket(location.href.replace("http", "ws"));

function forceRestart(turn, left, right) {
  socket.send(JSON.stringify({"request": "forceRestart", "info": {"turn":turn, "left":left, "right":right}}))
}

function sendGame() {
  socket.send(JSON.stringify({"game":game, "hand": player.hand, "username": user}));
}

function sendCards(username, cards) {
  socket.send(JSON.stringify({"request": "addCards", "info":{"username": username, "cards": cards}}))
}

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
  game = temp.game;
  if (temp.onJoin != undefined && player == null) {
    player = new Player(temp.onJoin,temp.hand)
    onClickCanvas();
    //autodraw25();
  }
  if (temp.request == "clearBoard") {
    clearBoard(temp.info);
  }
  if (temp.request == "addCards") {
    player.setHand = temp.hand;
  }
  if (temp.request == "forceRestart") {
    initializeClient(temp.game);
    player = new Player(game.players.indexOf(user))
  }
  if (game.phase == "play") {
    player.displayHand();
  }
  if (settings.autodraw && canDraw()) {
    setTimeout(function() {player.draw()},500)
  }
  if (deckDisplayed == false && game.phase == "play") {displayDeck();deckDisplayed = true;}
  if (game.phase == "end") {displayDeck();}
  displayButtons();
  displayGame();
});


const C = document.getElementById("c");
C.width = 1450;
C.height = 720;


/** @type {CanvasRenderingContext2D} */
const X = C.getContext("2d");

//in hand
const cardTop = 550;
const cardLeft = 50;
const cardHInterval = 30;
const cardVInterval = 30;
const cardLength = 125;
const cardHeight = 167;

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
function canDraw() {
  if (game.phase != "draw" && game.phase != "deck") {return false;}
  if (game.deck.length <= 8) {
    if (game.phase!= "deck" || player.id != game.first) {return false}
  } else if ((game.turn - player.id) % 4 != 0) {return false;}
  if (game.deck.length == 0) { return false; }
  return true;
}
function displayAutoDrawButton() {
  window.autodrawbutton = {
    "l": 1350,
    "t": 550,
    "r": 1450,
    "b": 580
  }
  X.fillStyle = "blue";
  if (settings.autodraw) {X.fillStyle = "green"}
  if (game.phase != "draw" && game.phase != "deck") {
    X.fillStyle = "red"
  }
  
  X.fillRect(autodrawbutton.l, autodrawbutton.t, autodrawbutton.r-autodrawbutton.l, autodrawbutton.b-autodrawbutton.t);
  X.fillStyle = "black";
  X.font = "20px Arial";
  X.fillText("Autodraw", autodrawbutton.l+7, autodrawbutton.t + 22);
}

function displayDrawButton() {
  window.drawbutton = {
    "l": 1200,
    "t": 550,
    "r": 1300,
    "b": 580
  }
  let tmp = checkNextButton() 
  if (tmp != false) {
    X.fillStyle = tmp;
    X.fillRect(drawbutton.l, drawbutton.t, drawbutton.r-drawbutton.l, drawbutton.b-drawbutton.t);
    X.fillStyle = "black";
    X.font = "30px Arial";
    X.fillText("Next", drawbutton.l+13, drawbutton.t + 25);
  } else {
    X.fillStyle = "blue";
    if (!canDraw()) {X.fillStyle = "red";}
    if (settings.autodraw) {X.fillStyle = "red";}
    X.fillRect(drawbutton.l, drawbutton.t, drawbutton.r-drawbutton.l, drawbutton.b-drawbutton.t);
    X.fillStyle = "black";
    X.font = "30px Arial";
    X.fillText("Draw", drawbutton.l+13, drawbutton.t + 25);
  }
}

async function clearBoard(info) {
  if (game.phase == "deck") {
    player.addCards(info[player.getId]);
    //add trump cards to righthand corner
    /*
    X.fillStyle = "black";
    X.font = "30px Arial";
    X.fillText("Trump", 1005, 35);
    */
    const trumpCardLoc = {"x":1000, "y": 50}
    const trumpCardButtonLoc = {}
    loadCard(game.dpbp[0]).then((img) => {
      X.drawImage(img, trumpCardLoc.x, trumpCardLoc.y, cLength, cHeight);
    }).catch((err) => {
      console.error(err);
    });
    player.clearSelection();
    player.displayHand();
  }
  if (game.phase == "play") {
    displayPoints();
  }
  if (info.end == true) {
    settings.autodraw = false;
    deckDisplayed = false;
    X.clearRect(0,0,c.width,c.height)
    displayButtons();
  }
}

function displayPlayButton() {
  window.playbutton = {
    "l": 1200,
    "t": 610,
    "r": 1300,
    "b": 640
  }

  X.fillStyle = "blue";
  if (player.getSelection.length == 0) {X.fillStyle = "red"}
  if (game.phase == "play" && ((game.turn - player.getId) % 4 != 0) || game.plays[player.getId].length > 0) {X.fillStyle = "red"}
  if (!player.isValid()) {X.fillStyle = "red"}
  X.fillRect(playbutton.l, playbutton.t, playbutton.r-playbutton.l, playbutton.b-playbutton.t);
  X.fillStyle = "black";
  X.font = "30px Arial";
  X.fillText("Play", playbutton.l+20, playbutton.t + 24);
}

function displayUndoButton() {
  window.undobutton = {
    "l": 1200,
    "t": 670,
    "r": 1300,
    "b": 700
  }
  X.fillStyle = "blue";
  if ((game.turn +3) % 4 != player.getId || game.plays[player.getId].length == 0) {X.fillStyle = "red"}
  X.fillRect(undobutton.l, undobutton.t, undobutton.r-undobutton.l, undobutton.b-undobutton.t);
  X.fillStyle = "black";
  X.font = "30px Arial";
  X.fillText("Undo", undobutton.l+15, undobutton.t + 25);
}

function displayDeck() {
  const deckLoc = {"x": 1000, "y": 210}
  let toDisplay = [108,108,108,108,108,108,108,108];
  if (game.deckOwner == player.id || game.phase == "end") {
    toDisplay = game.deck;
  }
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
}

function checkNextButton() {
  if (player.getId != 0) {return false}
  if (game.phase == "draw") {
    if (game.deck.length > 8) {return false;}
    if (game.dpbp.length == 0) {return "red";}
    return "green";
  }
  if (game.phase == "deck") {
    if (game.first == player.getId) {return false}
    return "red";
  }
  if (game.phase == "play") {
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
    console.log(e);
    if (e.offsetX<=drawbutton.r && e.offsetX>=drawbutton.l && e.offsetY>=drawbutton.t && e.offsetY<=drawbutton.b) {
      let tmp = checkNextButton()
      if (tmp != false) {
        if (tmp == "red") {return alert("You cannot use this button yet!")}
        socket.send(JSON.stringify({"request":"clearBoard"}))
      } else {
        if (settings.autodraw) {return alert("Autodraw is currently on!")}
        player.draw();
      }
    } else if (e.offsetX<=playbutton.r && e.offsetX>=playbutton.l && e.offsetY>=playbutton.t && e.offsetY<=playbutton.b) {
      player.play();
    } else if (e.offsetX<=undobutton.r && e.offsetX>=undobutton.l && e.offsetY>=undobutton.t && e.offsetY<=undobutton.b) {
      player.undo();
    } else if (e.offsetX<=autodrawbutton.r && e.offsetX>=autodrawbutton.l && e.offsetY>=autodrawbutton.t && e.offsetY<=autodrawbutton.b) {
      if (game.phase == "draw" || game.phase == "deck") {
        settings.autodraw = !settings.autodraw;
        if (settings.autodraw && canDraw()) {
          player.draw();
        }
        displayAutoDrawButton();
      }
    } else if (e.offsetX > cardLeft && e.offsetY > cardTop-cardVInterval) {
      for (let i = cardImageLoc.length-1;i>=0;i--) {
        if (e.offsetX >= cardImageLoc[i].x && e.offsetX <= cardImageLoc[i].x+cardLength && e.offsetY >= cardImageLoc[i].y && e.offsetY <= cardImageLoc[i].y + cardHeight) {
          if (cardImageLoc[i].s) {
            player.select(i);
          }
          break;
        }
      }
    } 
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

class Player {
  constructor(cid, init) {
    this.hand = [];
    this.id = cid;
    this.selection = [];
    if (init != undefined) {
      this.hand = init;
    }
  }

  undo() {
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

  play() {
    if (this.selection.length == 0) {return alert("You have not selected any cards yet!")}
    if (!this.isValid()) {return alert("This selection is not valid!")}
    if (game.first == -1) {game.first = player.id;}
    if (game.deckOwner == -1) {game.deckOwner = player.id;}
    if (game.phase == "draw") {
      if (this.selection[0] > 103) {
        this.hand = this.hand.concat(Object.keys(game.plays[this.id]));
        game.plays[this.id] = this.selection;
      }
      else {
        game.plays[this.id] = game.plays[this.id].concat(this.selection);
      }
      game.dpbp = game.plays[this.id];
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
      console.log(this.hand.splice(this.hand.indexOf(this.selection[i]),1))
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
        console.log(highestPriority)
        console.log(handHP)
        console.log(selectedHP)
        console.log("next")
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

  

  displayHand() {
    this.hand.sort(compareCards)
    X.clearRect(cardLeft, cardTop-cardVInterval, cardLeft+cardHInterval*(33)+75, cardTop+100);
    X.fillStyle = "#000000";
    let canSelect = this.possibleCards();
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

function getValues() {
  window.game.values = [];
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
      singles.sort(valueCompare).filter(c=>game.values[c] >= 0 && game.values[c] < 100+allowTrump)
      if (singles.length == 0) {return cards[cards.length-1]}
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
  socket.send(JSON.stringify({"request": "saveAsFile", "info": filename}))
}

function findWinner(p1,p2,o) {
  if (p1.length == 0) {return false}
  let mPa = findHighestPriority(o);
  let maxPriority = mPa.length
  let p1HP = findHighestPriority(p1, maxPriority);
  let p2HP = findHighestPriority(p2, maxPriority);
  console.log("findWinner",p1,p2,o, p1HP, p2HP,mPa)
  if (p1HP.length > p2HP.length) {
    return true;
  }
  else if (p1HP.length < p2HP.length) {
    return false;
  }
  else {
    if (game.values[p1HP[0]] >= game.values[p2HP[0]]) {
      return true;
    } else {
      if (suit(p1HP[0]) == suit(p2HP[0])) {
        return false;
      } else {
        return findWinner(spliceArray(p1,p1HP),spliceArray(p2,p2HP), spliceArray(o,mPa));
      }
    }
  }
}

