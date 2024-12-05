const express = require('express');
const admin = require('firebase-admin');
const axios = require('axios');
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');

// enable cors options
// const corsOptions = {
//     origin: 'https://vedbhakti.in', // Replace with your domain
//   };

  app.use(cors());
  app.use(bodyParser.json()); // Parse JSON bodies
app.use(bodyParser.urlencoded({ extended: true }));
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


const upload = multer({ storage: multer.memoryStorage() }); // Store image in memory temporarily





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


app.post('/onboard', upload.single('profileImage'), async (req, res) => {
  try {
    console.log('Received data:', req.body);

    const formData = req.body;

    // Parse JSON fields if they exist
    const languages = formData.languages ? JSON.parse(formData.languages) : [];
    const expertiseAreas = formData.expertiseAreas ? JSON.parse(formData.expertiseAreas) : [];
    const services = formData.services ? JSON.parse(formData.services) : [];

    // Prepare document data
    const documentData = {
      name: formData.name || '',
      title: formData.title || '',
      email: formData.email || '',
      phone: formData.phone || '',
      location: formData.location || '',
      experience: formData.experience || '',
      bio: formData.bio || '',
      languages,
      expertiseAreas,
      services,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Handle image upload
    if (req.file) {
      const bucket = admin.storage().bucket('ascendant-idea-443107-f8.firebaseio.com'); // Reference to Firebase Storage bucket
      const fileName = `profileImages/${Date.now()}-${req.file.originalname}`;
      const file = bucket.file(fileName);

      // Upload image to Firebase Storage
      await file.save(req.file.buffer, {
        metadata: { contentType: req.file.mimetype },
      });

      // Get public download URL
      const [url] = await file.getSignedUrl({
        action: 'read',
        expires: '03-01-2030', // Set an expiry date for the signed URL
      });

      // Add image URL to Firestore data
      documentData.profileImageUrl = url;
    }

    // Save data to Firestore
    const docRef = await db.collection('astro_pandit').add(documentData);

    res.status(201).json({ message: 'Application submitted successfully!', id: docRef.id });
  } catch (error) {
    console.error('Error saving data:', error);
    res.status(500).send('Failed to submit application');
  }
});


// New route for Prokerala API


// astro pandit app

app.post('/onboard',upload.none(), async (req, res) => {
    try {
      // Log the request body to debug
      console.log('Received data:', req.body);
  
      const formData = req.body;
  
      // Parse JSON fields if they exist
      const languages = formData.languages ? JSON.parse(formData.languages) : [];
      const expertiseAreas = formData.expertiseAreas ? JSON.parse(formData.expertiseAreas) : [];
      const services = formData.services ? JSON.parse(formData.services) : [];
  
      // Prepare document data
      const documentData = {
        name: formData.name || '',
        title: formData.title || '',
        email: formData.email || '',
        phone: formData.phone || '',
        location: formData.location || '',
        experience: formData.experience || '',
        bio: formData.bio || '',
        languages,
        expertiseAreas,
        services,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };
  
      // Save data to Firestore
      const docRef = await db.collection('astro_pandit').add(documentData);
  
      res.status(201).json({ message: 'Application submitted successfully!', id: docRef.id });
    } catch (error) {
      console.error('Error saving data:', error);
      res.status(500).send('Failed to submit application');
    }
  });
  
  // API endpoint to fetch all records from the "astro_pandit" collection
  app.get('/astro_pandit', async (req, res) => {
    try {
      const panditsRef = db.collection('astro_pandit');
      const snapshot = await panditsRef.get();
  
      if (snapshot.empty) {
        return res.status(404).send('No data found');
      }
  
      const pandits = [];
      snapshot.forEach((doc) => {
        pandits.push({ id: doc.id, ...doc.data() });
      });
  
      res.status(200).json(pandits);
    } catch (error) {
      console.error('Error fetching data:', error);
      res.status(500).send('Internal Server Error');
    }
  });

  
  // astro pandi app


  app.get('/panchang', async (req, res) => {
    const { day = new Date().getDate(), month = new Date().getMonth() + 1, 
            year = new Date().getFullYear(), place = 'Gurgaon', 
            lat = 28.4595, lon = 77.0266, timezoneoffset = '+5.5' } = req.query;
    
    const panchangKey = `${day}-${month}-${year}-${place}`;
    
    try {
      // Check if Panchang data for today exists in Firestore
      const doc = await db.collection('panchang').doc(panchangKey).get();
  
      // If today's data exists, return it
      if (doc.exists) {
        return res.json(doc.data().panchang); // Return cached data
      }
      
      // No data for today, delete the old data (if any) for the previous day
      const yesterdayKey = `${day - 1}-${month}-${year}-${place}`;
      await db.collection('panchang').doc(yesterdayKey).delete(); // Delete old data if exists
  
      // Fetch Panchang data from the API
      const { data } = await axios.get('https://horoscope-and-panchanga.p.rapidapi.com/zodiac/panchanga', {
        params: { day, month, year, place, lat, lon, timezoneoffset },
        headers: {
            'x-rapidapi-key': '82b6447f69msh660effd20a7cdbap121022jsnee4b5572f9e7',
            'x-rapidapi-host': 'horoscope-and-panchanga.p.rapidapi.com'
        }
      });
  
      const panchangData = data?.Panchang;
  
      if (!panchangData) {
        return res.status(500).json({ error: 'Panchang data is missing in the API response' });
      }
  
      // Save today's Panchang data to Firestore
      await db.collection('panchang').doc(panchangKey).set({
        panchang: panchangData,
        lastUpdated: new Date().toISOString(),
      });
  
      return res.json(panchangData); // Return the freshly fetched data
  
    } catch (error) {
      console.error('Error fetching Panchang data:', error);
      return res.status(500).json({ error: 'Error fetching Panchanga data' });
    }
  });
// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
