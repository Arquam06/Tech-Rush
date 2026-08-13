export function setupSocketHandlers(io) {
  // Meeting room namespace
  const meetingNS = io.of('/meeting');

  meetingNS.on('connection', (socket) => {
    console.log(`[Socket] Meeting participant connected: ${socket.id}`);

    socket.on('join-room', ({ roomId, userId, userName }) => {
      socket.join(roomId);
      socket.to(roomId).emit('user-joined', { userId, userName, socketId: socket.id });
      console.log(`[Socket] ${userName} joined room ${roomId}`);
    });

    socket.on('offer', ({ to, offer, from }) => {
      io.of('/meeting').to(to).emit('offer', { offer, from });
    });

    socket.on('answer', ({ to, answer, from }) => {
      io.of('/meeting').to(to).emit('answer', { answer, from });
    });

    socket.on('ice-candidate', ({ to, candidate, from }) => {
      io.of('/meeting').to(to).emit('ice-candidate', { candidate, from });
    });

    socket.on('chat-message', ({ roomId, message, userName, userId }) => {
      meetingNS.to(roomId).emit('chat-message', {
        message, userName, userId,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on('leave-room', ({ roomId, userId, userName }) => {
      socket.leave(roomId);
      socket.to(roomId).emit('user-left', { userId, userName, socketId: socket.id });
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Participant disconnected: ${socket.id}`);
    });
  });

  // Main app namespace — real-time notifications
  io.on('connection', (socket) => {
    socket.on('subscribe-notifications', ({ userId }) => {
      socket.join(`user:${userId}`);
    });

    socket.on('subscribe-project', ({ projectId }) => {
      socket.join(`project:${projectId}`);
    });

    socket.on('disconnect', () => {});
  });
}

export function emitToUser(io, userId, event, data) {
  io.to(`user:${userId}`).emit(event, data);
}

export function emitToProject(io, projectId, event, data) {
  io.to(`project:${projectId}`).emit(event, data);
}
