const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// 常规API路由
app.get('/api/data', (req, res) => {
  res.json({ message: 'Hello from API', timestamp: new Date() });
});

app.post('/api/data', (req, res) => {
  console.log('Received data:', req.body);
  res.json({ success: true, receivedData: req.body });
});

// 创建HTTP服务器
const server = http.createServer(app);

// 设置WebSocket服务器
const wss = new WebSocket.Server({ server });
const clients = new Set();

wss.on('connection', (ws) => {
  console.log('webSocket连接成功');
  clients.add(ws);

  // 处理客户端消息
  ws.on('message', (message) => {
    try {
      const parsedMessage = JSON.parse(message);
      // 根据消息类型处理
      if (parsedMessage.type === 'send') {
        ws.send(JSON.stringify({ type: 'echo-reply', data: parsedMessage.data }));
      }
    } catch (e) {
      console.error('信息处理失败：', e);
    }
  });

  // 心跳检测变量
  let isAlive = true;
  const heartbeatInterval = 30000; // 30秒发送一次 Ping

  // 1. 服务端定时发送 Ping
  const interval = setInterval(() => {
    if (!isAlive) {
      console.log('客户端无响应，主动断开连接');
      ws.terminate(); // 强制关闭连接
      return;
    }

    isAlive = false; // 标记为待检测状态
    ws.ping(); // 发送 Ping 帧
  }, heartbeatInterval);

  // 2. 监听客户端的 Pong 响应
  ws.on('pong', () => {
    isAlive = true; // 收到 Pong，连接健康
    console.log('收到客户端心跳响应');
  });

  // 3. 连接关闭清理
  ws.on('close', () => {
    clearInterval(interval);
    clients.delete(ws);
    console.log('客户端断开连接');
  });
  
});

// 启动服务器
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`服务器运行在端口${PORT}`);
});