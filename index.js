const express = require('express');
const admin = require('firebase-admin');
const axios = require('axios');
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');

// Enable CORS
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
const PORT = 3000;
// Initialize Firebase Admin SDK with explicit credentials
//const serviceAccount = require('./path-to-your-serviceAccount.json'); // Make sure this path is correct
admin.initializeApp({
    credential: admin.credential.applicationDefault(), // Use cert instead of applicationDefault
    storageBucket: 'ascendant-idea-443107-f8.appspot.com'
});

const db = admin.firestore();
const bucket = admin.storage().bucket(); // Initialize bucket once

// Configure multer with file size limits
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});



app.post('/onboard', upload.single('profileImage'), async (req, res) => {
  try {
      console.log('Received data:', req.body);
      
      const formData = req.body;
      
      // Parse JSON fields
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
          const fileName = `profileImages/${Date.now()}-${req.file.originalname}`;
          
          try {
              // Upload file with proper options for Cloud Run
              await bucket.file(fileName).save(req.file.buffer, {
                  contentType: req.file.mimetype,
                  metadata: {
                      contentType: req.file.mimetype,
                  },
                  public: true,
                  validation: 'md5'
              });

              // Get the public URL
              const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
              documentData.profileImageUrl = publicUrl;
              
          } catch (uploadError) {
              console.error('Upload error details:', uploadError);
              throw new Error(`Failed to upload image1111111111111111: ${uploadError.message}`);
          }
      }

      // Save to Firestore
      const docRef = await db.collection('astro_pandit').add(documentData);
      res.status(201).json({ 
          message: 'Application submitted successfully!', 
          id: docRef.id,
          data: documentData 
      });

  } catch (error) {
      console.error('Error full details:', error);
      res.status(500).json({ 
          error: 'Failed to submit application', 
          message: error 
      });
  }
});


// New route for Prokerala API


// astro pandit app


  
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
