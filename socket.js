module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log('A user connected');

    // Placeholder for future event handlers
    // socket.on('event_name', (data) => {
    //   // Handle the event
    // });

    socket.on('disconnect', () => {
      console.log('A user disconnected');
    });
  });
}; 