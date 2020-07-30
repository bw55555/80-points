const HTTP = require("http");
const WS = require("websocket").server;
const FS = require("fs");
const PATH = "public";
const MIMES = {
    "html": "text/html"
};
const RDI = {
    "/": "/index.html"
};

const unskippables = [0,3,8,11,12];
const pointvals = [0,0,0,5,0,0,0,0,10,0,0,10,0,0,0]//{"3":5, "8":10, "11":10}
let uid = -1;
game = FS.readFileSync('saves/saveGame.json', 'utf8');
if (game == "{}" || game == "") {
  game = {}
  game.players = [];
  game.score = [0,0]
  game.trump = 0;
  game.first = -1;
  game.deckOwner = -1;
  initializeGame(0);
} else {
  game = JSON.parse(game);
}



function send404(res) {
    res.writeHead(404, {
        'content-type': "text/html"
    });
    res.end('<!DOCTYPE html> <html><head><title>404</title></head><body>404 - Not Found</body></html>');
}

/**
 * @param {String} path path of file
 */
function getExtension(path) {
    let li = path.lastIndexOf('.') + 1;
    return path.slice(li);
}

function getMime(path) {
    return MIMES[getExtension(path)] || "text/plain";
}

const server = HTTP.createServer(function(req, res) {
    let reqpath = req.url;

    if (RDI.hasOwnProperty(reqpath)) {
        reqpath = RDI[reqpath];
    }

    FS.readFile(PATH + reqpath, function(err, data) {
        if (err) {
            send404(res);
            return;
        }

        res.writeHead(200, {
            'content-type': getMime(reqpath)
        });

        res.end(data);
    });
});

server.listen(5000);

const CMDS = {
    move: 0,
    add: 1,
    remove: 2
};

const ws = new WS({
    httpServer: server
});

function wsSendAll(data, exclude) {
    for (const connection of ws.connections) {
        if (connection === exclude) continue;
        connection.send(data);
    }
}

function wsSendOne(data, id) {
    for (const connection of ws.connections) {
        if (connection.clientId !== id) continue;
        connection.send(data);
    }
}

function initializeGame(turn) {
  game.deck = [];
  for (var i = 0;i<108;i++) {game.deck.push(i);}
  game.dpbp = [];//draw phase biggest play
  game.plays = [[],[],[],[]]
  game.tsuit = -1;
  game.phase = "draw";
  game.turn = turn;
  game.points = [];
  game.values = [];
  game.lastTurn = false;
  game.lastWin = -1;
}
function gcn(id) {
  return Math.floor(id/2)
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
  let truetrump = game.tsuit === -1 ? 0 : 1
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
  if (maxPriority == undefined) {maxPriority = 33;}
  let cPairs = findCPairs(cards).sort(valueCompare).filter(c=>game.values[c] >= 0);
  if (cPairs.length == 0 || maxPriority <= 2) {
    let pairs = findPairs(cards).filter(c=>game.values[c] >= 0);
    if (pairs.length == 0 || maxPriority == 1) {
      let singles = cards.filter(c=>true);
      singles.sort(valueCompare).filter(c=>game.values[c] >= 0)
      if (singles.length > 0) {return [cards[cards.length-1]]}
      return []
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

function spliceArray(a1,a2) {
  return a1.filter(item => a2.indexOf(item) == -1)
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

function clearBoard() {
  if (game.phase == "draw") {
    let toSend = {"request": "clearBoard", "info": game.plays}
    game.plays = [[],[],[],[]];
    game.tsuit = truesuit(game.dpbp[0]);
    game.phase = "deck";
    toSend.game = game;
    wsSendAll(JSON.stringify(toSend));
  } else if (game.phase == "play") {
    let toSend = {"request": "clearBoard", "info": {}}
    let currwin = game.first;
    let curr = (game.first+1)%4;
    for (let i = 0;i<3;i++) {
      console.log(currwin, curr, game.plays[currwin], game.plays[curr])
      if (!findWinner(game.plays[currwin], game.plays[curr], game.plays[game.first])) {
        currwin = curr
      }
      curr=(curr+1)%4
    }
    game.first = currwin;
    game.turn = currwin;
    if(currwin % 2 != game.deckOwner % 2 ){
      for (let i = 0;i<4;i++) {
        game.points = game.points.concat(game.plays[i].filter(c=> pointvals[num(c)] >0))
      }
    }
    if (game.lastTurn == true) {
      game.phase = "end"
    } else {
      game.plays = [[],[],[],[]]
    }
    game.lastWin = currwin;
    toSend.game = game;
    wsSendAll(JSON.stringify(toSend));
  } else if (game.phase == "end") {
    let toSend = {"request": "clearBoard", "info": {"end":true}}
    let ptsum = game.points.reduce((pts,cid) => pts+pointvals[num(cid)],0)
    let deckptsum = game.deck.reduce((pts,cid) => pts+pointvals[num(cid)],0)
    deckptsum*=(2*game.plays[0].length)
    if (game.lastWin % 2 != game.deckOwner %2) {
      ptsum+=deckptsum;
    }
    let winner = 0;
    if (ptsum < 80) {
      winner = game.deckOwner % 2
      let prevScore = game.score[winner];
      game.score[winner] += Math.floor((80-ptsum)/40)+1
      for (let barrier of unskippables) {
        if (prevScore < barrier && game.score[winner]>barrier) {
          game.score[winner] = barrier;
        }
      }
      game.deckOwner = (game.deckOwner + 2) % 4;
    } else {
      winner = (game.deckOwner+1) % 2
      let prevScore = game.score[winner];
      game.score[winner] += Math.floor((ptsum-80)/40)
      for (let barrier of unskippables) {
        if (prevScore <= barrier && game.score[winner]>barrier) {
          game.score[winner] = barrier;
        }
      }
      game.deckOwner = (game.deckOwner + 1) % 4;
    }
    game.first = game.deckOwner
    initializeGame(game.deckOwner);
    game.trump = game.score[winner];
    saveGame();
    toSend.game = game;
    wsSendAll(JSON.stringify(toSend));
  }
  
}

function addCardToHand(info) {
  playerHands[info.username] = playerHands[info.username].concat(info.cards);
  wsSendOne(JSON.stringify({"game":game, "hand": playerHands[info.username], "request": "addCards"}), game.players.indexOf(info.username))
}

function forceRestart(info) {
  game.deckOwner = info.turn
  game.first = info.turn
  game.score = [info.left,info.right]
  initializeGame(info.turn);
  game.trump = game.score[(info.turn % 2)]
  wsSendAll(JSON.stringify({"request": "forceRestart", "game":game}))
}

let playerHands = {};

ws.on("request", function(req) {
    const client = req.accept(null, req.origin);
    console.log("new client");
    //console.log(req)
    client.send(JSON.stringify({"getUsername":true}))
    client.on("message", function(msg) {
      //console.log(msg)
      let temp = JSON.parse(msg.utf8Data)
      console.log(temp.game)
      if (temp.hand != undefined) {
        playerHands[temp.username] = temp.hand;
      }
      if (temp.getUsername == true) {
        let username = temp.username;
        if (game.players.indexOf(username) == -1 && game.players.length < 4) {
          game.players.push(username);
          client.send(JSON.stringify({"onJoin":game.players.indexOf(username), "game":game}))
          client.clientId = game.players.indexOf(username);
          wsSendAll(JSON.stringify({"game":game}),client)
        } else if (game.players.indexOf(username) != -1) {
          for (const connection of ws.connections) {
            if (connection.clientId === game.players.indexOf(username)) {client.send(JSON.stringify({"failmsg":"This player is already in the game!"})); return;}
          }
          client.send(JSON.stringify({"onJoin":game.players.indexOf(username), "game":game, "hand": playerHands[username]}))
          client.clientId = game.players.indexOf(username);
        } else {
          client.send(JSON.stringify({"failmsg":"There are already 4 players in the game!"}))
        }
      } else if (temp.request == "clearBoard") {
        clearBoard();
      } else if (temp.request == "addCards") {
        addCardToHand(temp.info)  
      } else if (temp.request == "forceRestart") {
        forceRestart(temp.info)  
      } else if (temp.request == "saveAsFile") {
        saveGame(temp.info)
      } else {
        game = temp.game;
        wsSendAll(JSON.stringify({"game":game}))
      }
    });
    client.on("close", function() {
        //parseData(client, clientId, [CMDS.remove]);
        console.log("client disconnected");
    });
});
function saveGame(fileName) {
  if (fileName == undefined) {fileName = "saveGame"}
  FS.writeFile('saves/'+fileName+".json", JSON.stringify(game), function (err) {
    if (err) throw err;
    console.log('Saved!');
  });
}
