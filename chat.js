const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const socketIo = require('socket.io');

// Initialize Firestore
const db = getFirestore();

module.exports = function (app, server) {
    const io = socketIo(server);

    // Fetch chat messages from Firestore
    app.get('/chat/messages', async (req, res) => {
        try {
            const messagesRef = db.collection('chatMessages').orderBy('timestamp');
            const snapshot = await messagesRef.get();

            if (snapshot.empty) {
                return res.status(404).send('No chat messages found');
            }

            const messages = [];
            snapshot.forEach((doc) => {
                messages.push({ id: doc.id, ...doc.data() });
            });

            res.status(200).json(messages);
        } catch (error) {
            console.error('Error fetching messages:', error);
            res.status(500).send('Internal Server Error');
        }
    });

    // Send a new chat message and save it to Firestore
    app.post('/chat/send', async (req, res) => {
        const { user, text } = req.body;

        if (!user || !text) {
            return res.status(400).send('User and text are required');
        }
        console.log('dsfsfsfsd');
        try {
            // Save message to Firestore
            const messageRef = await db.collection('chatMessages').add({
                user,
                text,
                timestamp: FieldValue.serverTimestamp()
            });

            // Emit new message to all connected clients via WebSocket
            io.emit('chatMessage', { id: messageRef.id, user, text });

            res.status(201).send('Message sent');
        } catch (error) {
            console.error('Error sending message:', error);
            res.status(500).send('Internal Server Error');
        }
    });

    // WebSocket connection for real-time messaging
    io.on('connection', (socket) => {
        console.log('A user connected');

        // Listen for incoming messages from clients
        socket.on('chatMessage', (msg) => {
            console.log('Message received:', msg);
            // Optionally, save the message to Firestore and broadcast to other clients
            db.collection('chatMessages').add({
                user: msg.user,
                text: msg.text,
                timestamp: FieldValue.serverTimestamp()
            }).then((docRef) => {
                // Broadcast message to all clients
                io.emit('chatMessage', { id: docRef.id, user: msg.user, text: msg.text });
            }).catch((error) => {
                console.error('Error saving message:', error);
            });
        });

        socket.on('disconnect', () => {
            console.log('User disconnected');
        });
    });
};
