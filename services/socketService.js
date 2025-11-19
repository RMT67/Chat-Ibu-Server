const { Server } = require('socket.io');
const { Chat, User, Room } = require('../models');

let io;

const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST']
    }
  });
  
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    
    // Store userId for this socket
    let socketUserId = null;
    
    // Join room
    socket.on('join:room', async ({ userId, roomId }) => {
      socketUserId = userId;
      const roomKey = `room-${roomId}`;
      socket.join(roomKey);
      
      // Update user online status
      const user = await User.findByPk(userId);
      if (user) {
        user.isOnline = true;
        user.lastSeen = new Date();
        await user.save();
        
        // Broadcast user online to all clients with user data
        io.emit('user:online', { 
          userId, 
          isOnline: true,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            photoUrl: user.photoUrl,
            isOnline: true
          }
        });
      }
      
      // Send chat history for this room
      const chats = await Chat.findAll({
        where: { RoomId: roomId },
        include: [
          { model: User, attributes: ['id', 'name', 'photoUrl'] },
          { model: Room, attributes: ['id', 'name'] }
        ],
        order: [['createdAt', 'DESC']],
        limit: 50
      });
      
      socket.emit('chat:history', { messages: chats.reverse(), roomId });
      
      // Send list of online users
      const onlineUsers = await User.findAll({
        where: { isOnline: true },
        attributes: ['id', 'name', 'email', 'photoUrl', 'isOnline']
      });
      socket.emit('users:online', { users: onlineUsers });
    });
    
    // Handle new message
    socket.on('chat:message', async ({ userId, message, roomId }) => {
      try {
        if (!roomId) {
          socket.emit('error', { message: 'Room ID is required' });
          return;
        }
        
        // Verify room exists and is active
        const room = await Room.findByPk(roomId);
        if (!room || !room.isActive) {
          socket.emit('error', { message: 'Room not found or inactive' });
          return;
        }
        
        // Save to database
        const chat = await Chat.create({
          UserId: userId,
          message,
          RoomId: roomId
        });
        
        // Load with associations
        const chatWithUser = await Chat.findByPk(chat.id, {
          include: [
            { model: User, attributes: ['id', 'name', 'photoUrl'] },
            { model: Room, attributes: ['id', 'name'] }
          ]
        });
        
        // Broadcast to all users in the room
        const roomKey = `room-${roomId}`;
        io.to(roomKey).emit('chat:new_message', chatWithUser);
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });
    
    // Handle typing indicator
    const typingUsers = new Map();
    
    socket.on('typing:start', ({ userId, roomId }) => {
      typingUsers.set(userId, true);
      if (roomId) {
        const roomKey = `room-${roomId}`;
        socket.broadcast.to(roomKey).emit('typing:indicator', {
          userId,
          isTyping: true
        });
      }
    });
    
    socket.on('typing:stop', ({ userId, roomId }) => {
      typingUsers.delete(userId);
      if (roomId) {
        const roomKey = `room-${roomId}`;
        socket.broadcast.to(roomKey).emit('typing:indicator', {
          userId,
          isTyping: false
        });
      }
    });
    
    // Handle disconnect
    socket.on('disconnect', async () => {
      console.log('User disconnected:', socket.id);
      
      // Update user offline status
      if (socketUserId) {
        await User.update(
          { isOnline: false, lastSeen: new Date() },
          { where: { id: socketUserId } }
        );
        
        // Broadcast user offline to all clients
        io.emit('user:offline', { userId: socketUserId, isOnline: false });
      }
    });
  });
  
  return io;
};

const getIO = () => io;

module.exports = {
  initializeSocket,
  getIO
};

