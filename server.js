const WebSocket = require('ws');
const PORT = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port: PORT });

const rooms = {};

wss.on('connection', (ws) => {
  ws.on('message', (msg) => {
    const data = JSON.parse(msg);

    if (data.type === 'join') {
      const roomId = data.room;
      if (!rooms[roomId]) rooms[roomId] = [];
      const room = rooms[roomId];
      if (room.length >= 2) { ws.send(JSON.stringify({ type: 'full' })); return; }
      const playerNum = room.length + 1;
      ws.roomId = roomId;
      ws.playerNum = playerNum;
      room.push(ws);
      ws.send(JSON.stringify({ type: 'assigned', player: playerNum }));
      if (room.length === 2) {
        room.forEach(c => c.send(JSON.stringify({ type: 'start' })));
      }
    }

    if (data.type === 'state') {
      const room = rooms[ws.roomId];
      if (!room) return;
      room.forEach(c => { if (c !== ws && c.readyState === 1) c.send(msg.toString()); });
    }
  });

  ws.on('close', () => {
    const room = rooms[ws.roomId];
    if (!room) return;
    const idx = room.indexOf(ws);
    if (idx > -1) room.splice(idx, 1);
    room.forEach(c => c.send(JSON.stringify({ type: 'opponent_left' })));
    if (room.length === 0) delete rooms[ws.roomId];
  });
});

console.log('Server running on port', PORT);