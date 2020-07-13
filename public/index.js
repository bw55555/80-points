/** @type {HTMLCanvasElement} */
window.game = {};
window.cardImageLoc = [];
window.player = null;
window.user = prompt("Please enter your name.");

const socket = new WebSocket(location.href.replace("http", "ws"));

function sendGame() {
  socket.send(JSON.stringify({"game":game}));
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
    player = new Player(temp.onJoin)
    onClickCanvas();
    autodraw25();
  }
  if (temp.request == "clearBoard") {
    clearBoard(temp.info);
  }
  displayGame();
  player.displayHand();
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
cardids.push("/cards/back")

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
    if (game.phase != "draw" && game.phase != "deck") {X.fillStyle = "red";}
    if (game.turn > 99) {
      if (game.phase!= "deck" || player.id != game.first) {X.fillStyle = "red";}
    } else if ((game.turn - player.id) % 4 != 0) {X.fillStyle = "red";}
    if (game.deck.length == 0) { X.fillStyle = "red"; }
    
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
    X.fillStyle = "black";
    X.font = "30px Arial";
    X.fillText("Trump", 1005, 35);
    const trumpCardLoc = {"x":1000, "y": 50}
    const trumpCardButtonLoc = {}
    loadCard(game.dpbp[0]).then((img) => {
      X.drawImage(img, trumpCardLoc.x, trumpCardLoc.y, cLength, cHeight);
    }).catch((err) => {
      console.error(err);
    });
    player.displayHand();
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
  X.fillRect(undobutton.l, undobutton.t, undobutton.r-undobutton.l, undobutton.b-undobutton.t);
  X.fillStyle = "black";
  X.font = "30px Arial";
  X.fillText("Undo", undobutton.l+15, undobutton.t + 25);
}

function displayDeck() {
  const deckLoc = {"x": 1000, "y": 210}
  let toDisplay = [108,108,108,108,108,108,108,108];
  if (game.deckOwner == player.id) {
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

function displayButtons() {
  displayDrawButton();
  displayPlayButton();
  displayUndoButton();
}

function checkNextButton() {
  if (player.getId != 0) {return false}
  if (game.phase == "draw") {
    if (game.turn < 100) {return false;}
    if (game.dpbp.length == 0) {return "red";}
    return "green";
  }
  if (game.phase == "deck") {
    if (game.first == player.getId) {return false}
    return "red";
  }
  if (game.phase == "play") {
    return "red";
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
        player.draw();
      }
    } else if (e.offsetX<=playbutton.r && e.offsetX>=playbutton.l && e.offsetY>=playbutton.t && e.offsetY<=playbutton.b) {
      player.play();
    } else if (e.offsetX > cardLeft && e.offsetY > cardTop-cardVInterval) {
      for (let i = cardImageLoc.length-1;i>=0;i--) {
        if (cardImageLoc[i].s && e.offsetX >= cardImageLoc[i].x && e.offsetX <= cardImageLoc[i].x+cardLength && e.offsetY >= cardImageLoc[i].y && e.offsetY <= cardImageLoc[i].y + cardHeight) {player.select(i);break;}
      }
    }
  }, false);
}

async function displayGame() {

  const tlc = 150; //topLeftCorner
  const sl = 200; //length of square
  const rightSide = {"l": tlc, "r":tlc+sl, "t":tlc+sl}
  const downSide = {"l": tlc, "r": tlc+sl, "t": tlc+sl}
  const leftSide = {"l": tlc, "r": tlc+sl, "t":tlc-cHeight}
  const upSide = {"l": tlc, "r": tlc+sl, "t":tlc-cHeight}
  X.clearRect(tlc-cHeight, tlc-cHeight, tlc+sl+cHeight, tlc+sl+cHeight);
  let currid = player.getId;
  let start = downSide.l + Math.floor((downSide.r - downSide.l - (game.plays[currid].length-1)*cInterval - cLength)/2);
  await Promise.all(game.plays[currid].map(i => loadCard(i))).then((images) => {
      for (let i = 0;i<images.length;i++) {
        X.drawImage(images[i], start+cInterval*i, downSide.t, cLength, cHeight);
      }
  }).catch((err) => {
    console.error(err);
  });
  currid = (currid+1) %4;
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
  currid = (currid+1) %4;
  start = upSide.l + Math.floor((upSide.r - upSide.l - (game.plays[currid].length-1)*cInterval - cLength)/2);
  await Promise.all(game.plays[currid].map(i => loadCard(i))).then((images) => {
      for (let i = 0;i<images.length;i++) {
        X.drawImage(images[i], start+cInterval*i, upSide.t, cLength, cHeight);
      }
  }).catch((err) => {
    console.error(err);
  });
  currid = (currid+1) %4;
  start = leftSide.l + Math.floor((leftSide.r - leftSide.l - ((game.plays[currid].length-1)*cInterval) + cLength)/2);
  await Promise.all(game.plays[currid].map(i => loadCard(i))).then((images) => {
    X.save();
    X.translate(leftSide.t, start);
    X.rotate(3*Math.PI/2);
    for (let i = 0;i<images.length;i++) {
      X.drawImage(images[i], -cInterval*i, 0, cLength, cHeight);
    }
    X.restore();
  }).catch((err) => {
      console.error(err);
  });
  
}

class Player {
  constructor(cid) {
    this.hand = [];
    this.id = cid;
    this.selection = [];
  }

  undo() {
    addCards(game.plays[this.id])
    game.plays[this.id] = [];
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
      displayDeck();
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
  }

  draw() {
    if (game.phase != "draw" && game.phase != "deck") { return alert("There are no cards left in the deck!"); }
    if (game.turn > 99) {
      if (game.phase != "deck" || this.id != game.first) {return alert("It is not your turn right now!")}
    } else if ((game.turn - this.id) % 4 != 0) {return alert("It is not your turn right now!")}
    if (game.deck.length == 0) { return alert("There are no cards left in the deck!"); }
    
    this.hand.push(game.deck.splice(Math.floor(Math.random()*game.deck.length),1)[0]);
    if (game.deck.length < 8) {game.phase = "deck";}
    game.turn++;
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
  }

  get getHand() {
    return this.hand;
  }
  
  select(index) {
    let cardnum = this.hand[index];
    if (this.selection.indexOf(cardnum) != -1) {this.selection.splice(this.selection.indexOf(cardnum))}
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
        possible = possible.concat(this.hand.filter(c => gcn(c) == gcn(this.selection.find(d => d >= 104))))
      } else if (this.selection.find(c => c < 104) == undefined) {
        if (this.hasCard(104) && this.hasCard(105)) {possible.push(104);possible.push(105)}
        if (this.hasCard(106) && this.hasCard(107)) {possible.push(106);possible.push(107)}
      }
      if (fieldCards.length == 2) {}
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
        return this.hand.filter(c=> suit(c) == suit(this.selection[0]))
      }
    }
    return [];
  }

  displayHand() {
    this.hand.sort(compareCards)
    X.clearRect(cardLeft, cardTop-cardVInterval, cardLeft+cardHInterval*(32)+75, cardTop+100);
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

function compareCards(a,b) {
  let tn = game.trump;
  let ts = game.tsuit;
  if (a>105 && b>105) {return a-b;}
  else if (a>105) {return 1;}
  else if (b>105) {return -1;}
  else if (Math.floor(a/2) %13 == tn && Math.floor(b/2) %13 == tn) {return a-b;}
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
  if (id >= 104) {return 13;}
  return gcn(id) % 13;
}

function suit(id) {
  if (id >= 104) {return game.tsuit;}
  if (num(id) == game.trump) {return game.tsuit}
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

function loadCards(cards) {
    X.fillStyle = "#000000";
    Promise.all(cards.map(i => loadCard(i))).then((images) => {
      for (let i = 0;i<images.length;i++) {
          X.drawImage(images[i], 50+20*i, 600);
      }
    }).catch((err) => {
        console.error(err);
    });
    
    //requestAnimationFrame(reqanf);
}


