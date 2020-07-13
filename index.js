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

let uid = -1;
game = {};
game.players = [];
game.deck = [];
game.lt = 0;
game.rt = 0;
game.trump = 0;
game.tsuit = false;
game.deck = [];
game.plays = [[],[],[],[]]
game.dpbp = []; //draw phase biggest play
game.phase = "draw";
game.first = -1;
game.deckOwner = -1;
game.turn = 96;

function gcn(id) {
  return Math.floor(id/2)
}

function num(id) {
  if (id >= 104) {return -1;}
  return gcn(id) % 13;
}

function suit(id) {
  if (id >= 104) {return game.tsuit;}
  if (num(id) == game.trump) {return game.tsuit}
  return (gcn(id)-num(id))/13
}

function clearBoard() {
  let toSend = {"request": "clearBoard", "info": game.plays}
  game.plays = [[],[],[],[]];
  game.trump = num(game.dpbp[0])
  game.tsuit = suit(game.dpbp[0])
  game.phase = "deck";
  toSend.game = game;
  wsSendAll(JSON.stringify(toSend));
}

for (var i = 0;i<108;i++) {game.deck.push(i);}
ws.on("request", function(req) {
    const client = req.accept(null, req.origin);
    console.log("new client");
    //console.log(req)
    client.send(JSON.stringify({"getUsername":true}))
    client.on("message", function(msg) {
      //console.log(msg)
      let temp = JSON.parse(msg.utf8Data)
      console.log(temp.game)
      if (temp.getUsername == true) {
        let username = temp.username;
        if (game.players.indexOf(username) == -1 && game.players.length < 4) {
          game.players.push(username);
          client.send(JSON.stringify({"onJoin":game.players.indexOf(username), "game":game}))
          client.clientId = game.players.indexOf(username);
          wsSendAll(JSON.stringify({"game":game}),client)
        } else if (game.players.indexOf(username) != -1) {
          client.send(JSON.stringify({"onJoin":game.players.indexOf(username), "game":game}))
          client.clientId = game.players.indexOf(username);
        } else {
          client.send(JSON.stringify({"failmsg":"There are already 4 players in the game!"}))
        }
      } else if (temp.request == "clearBoard") {
        clearBoard();
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