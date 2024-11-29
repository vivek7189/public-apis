const express = require('express');
const admin = require('firebase-admin');
const axios = require('axios');
const app = express();
const cors = require('cors');

// enable cors options
// const corsOptions = {
//     origin: 'https://vedbhakti.in', // Replace with your domain
//   };

  app.use(cors());
// Initialize Firebase Admin SDK
admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    databaseURL: 'https://ascendant-idea-443107-f8.firebaseio.com',
});

const db = admin.firestore();
const PORT = 8080;

// Prokerala API Credentials
const CLIENT_ID = '39abd687-3d3a-4311-8026-2871736cde56'; // Replace with your Client ID
const CLIENT_SECRET = 'q9YHkQ1LAXx4JDRavekz853wP3g56gbikck3qUcU'; // Replace with your Client Secret
const API_URL = 'https://api.prokerala.com/';







// Routes
app.get('/', (req, res) => {
    res.send('Hello, Cloud Run!');
});

app.get('/hello', (req, res) => {
    res.send('Hello, Cloud Run! hello boy');
});

app.get('/health', (req, res) => {
    res.send('API running fine');
});

// Fetch users from Firestore
app.get('/users', async (req, res) => {
    try {
        const usersRef = db.collection('users');
        const snapshot = await usersRef.get();

        if (snapshot.empty) {
            return res.status(404).send('No users found');
        }

        const users = [];
        snapshot.forEach((doc) => {
            users.push({ id: doc.id, ...doc.data() });
        });

        res.status(200).json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).send('Internal Server Error');
    }
});

// New route for Prokerala API



app.get('/panchang', async (req, res) => {
    const { day = new Date().getDate(), month = new Date().getMonth() + 1, 
            year = new Date().getFullYear(), place = 'Gurgaon', 
            lat = 28.4595, lon = 77.0266, timezoneoffset = '+5.5' } = req.query;
  
    const panchangKey = `${day}-${month}-${year}-${place}`;
  
    try {
      // Check if Panchang data exists in Firestore
      const doc = await db.collection('panchang').doc(panchangKey).get();
      if (doc.exists) {
        return res.json(doc.data().panchang); // Return cached data
      }
  
      // Fetch Panchang data from API if not found in DB
      const { data } = await axios.get('https://horoscope-and-panchanga.p.rapidapi.com/zodiac/panchanga', {
        params: { day, month, year, place, lat, lon, timezoneoffset },
        headers: {
          'x-rapidapi-key': '82b6447f69msh660effd20a7cdbap121022jsnee4b5572f9e7',
          'x-rapidapi-host': 'horoscope-and-panchanga.p.rapidapi.com'
        }
      });
  
      // Save Panchang data to Firestore
      await db.collection('panchang').doc(panchangKey).set({
        panchang: data.panchang,
        lastUpdated: new Date().toISOString(),
      });
  
      return res.json(data.panchang); // Return fetched data
    } catch (error) {
      console.error('Error fetching Panchang data:', error);
      return res.status(500).json({ error: 'Error fetching Panchanga data' });
    }
  });

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
