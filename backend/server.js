import app from './src/app.js';
import { createServer } from 'http';
import { Server as SocketIO } from 'socket.io';
import { setupSocketHandlers } from './src/lib/socketHandlers.js';

const httpServer = createServer(app);

const corsOptions = {
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

const io = new SocketIO(httpServer, {
  cors: corsOptions,
});

app.set('io', io);
setupSocketHandlers(io);

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 AI Workplace OS API running on http://0.0.0.0:${PORT}`);
  console.log(`📡 Socket.IO ready`);
});

export { io };
