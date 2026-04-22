const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const socketHandler = require('./socket');
const winston = require('winston');
const authRoutes = require('./auth/routes');

// Logger setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console({ format: winston.format.simple() }),
  ],
});

const app = express();
app.use(cors());
app.use(express.json());
app.use('/auth', authRoutes);

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // Allow all for MVP
    methods: ['GET', 'POST']
  }
});

// Initialize Socket.io handler
socketHandler(io, logger);

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
