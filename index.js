const express = require('express');
const admin = require('firebase-admin');
const app = express();

// Initialize Firebase Admin SDK
//const serviceAccount = require('./ascendant-idea-443107-f8-16719d951d18.json');

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  databaseURL: 'https://ascendant-idea-443107-f8.firebaseio.com'
});

const db = admin.firestore();
//console.log('hello',db);
// Define port
const PORT = 8080;

// Routes
app.get('/', (req, res) => {
  res.send('Hello, Cloud Run!');
});

app.get('/hello', (req, res) => {
  res.send('Hello, Cloud Run! hello boy');
});

// Fetch users from Firestore
app.get('/users', async (req, res) => {
  try {
    const usersRef = db.collection('users');
    console.log('usersRef',usersRef);
    const snapshot = await usersRef.get();
    
    if (snapshot.empty) {
      return res.status(404).send('No users found');
    }

    const users = [];
    snapshot.forEach(doc => {
      users.push({ id: doc.id, ...doc.data() });
    });

    res.status(200).json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
