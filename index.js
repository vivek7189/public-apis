const express = require('express');
const multer = require('multer');
const { Storage } = require('@google-cloud/storage');
const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { google } = require('googleapis');
const moment = require('moment-timezone');
const cors = require('cors');
const fetch = require('node:fetch');

const axios = require('axios');
const app = express();
app.use(cors());
app.use(express.json());



const upload = multer({ storage: multer.memoryStorage() });
//app.use(express.static('public'));
// app.use(cors({
//   origin: 'http://localhost:8080',  // Replace with your front-end URL
//   methods: ['GET', 'POST'],
//   allowedHeaders: ['Content-Type']
// }));

// Initialize Storage with application default credentials
const storage = new Storage();
const bucket = storage.bucket('demoimage-7189');

// Initialize Firebase Admin with application default credentials
initializeApp({
    credential: applicationDefault()
});

const db = getFirestore();



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


// astro pandit app
app.post('/onboard', upload.single('profileImage'), async (req, res) => {
  try {
      if (!req.file || !req.body) {
          return res.status(400).json({ error: 'Missing required fields' });
      }

      // Upload image
      const filename = `images/${Date.now()}-${req.file.originalname}`;
      const blob = bucket.file(filename);
      console.log('bucket.name33',bucket.name);
      await blob.save(req.file.buffer, {
          contentType: req.file.mimetype
      });

      const imageUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`;
      
      // Parse arrays if they're sent as strings
      const languages = req.body.languages ? JSON.parse(req.body.languages) : [];
      const expertiseAreas = req.body.expertiseAreas ? JSON.parse(req.body.expertiseAreas) : [];
      const services = req.body.services ? JSON.parse(req.body.services) : [];

      // Create user data object
      const userData = {
          name: req.body.name || '',
          title: req.body.title || '',
          email: req.body.email || '',
          phone: req.body.phone || '',
          location: req.body.location || '',
          experience: req.body.experience || '',
          bio: req.body.bio || '',
          languages: languages,
          expertiseAreas: expertiseAreas,
          services: services,
          imageUrl: imageUrl,
          createdAt: FieldValue.serverTimestamp()
      };

      const docRef = await db.collection('astro_pandit').add(userData);
      
      res.status(200).json({
          message: 'Registration successful',
          userId: docRef.id,
          data: userData
      });

  } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ error: 'Registration failed', details: error.message });
  }
});


app.get('/astrologers', async (req, res) => {
  try {
      // Get reference to the collection
      const astrologersRef = db.collection('astro_pandit');
      
      // Get all documents
      const snapshot = await astrologersRef.orderBy('createdAt', 'desc').get();

      if (snapshot.empty) {
          return res.status(200).json({ 
              message: 'No astrologers found',
              data: [] 
          });
      }

      // Transform the data
      const astrologers = [];
      snapshot.forEach(doc => {
          astrologers.push({
              id: doc.id,
              ...doc.data(),
              // Convert Timestamp to ISO string for easier handling in frontend
              createdAt: doc.data().createdAt ? doc.data().createdAt.toDate().toISOString() : null
          });
      });

      res.status(200).json({
          message: 'Astrologers fetched successfully',
          count: astrologers.length,
          data: astrologers
      });

  } catch (error) {
      console.error('Error fetching astrologers:', error);
      res.status(500).json({ 
          error: 'Failed to fetch astrologers', 
          details: error.message 
      });
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
  
app.get('/astro_pandit/:phoneNumber', async (req, res) => {
  try {
    const { phoneNumber } = req.params;

    // Input validation
    if (!phoneNumber || !/^\d{10}$/.test(phoneNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid 10-digit phone number'
      });
    }

    const panditsRef = db.collection('astro_pandit');
    const snapshot = await panditsRef
      .where('phone', '==', phoneNumber)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({
        success: false,
        message: 'No astrologer found with this phone number'
      });
    }

    // Get the first matching document
    const panditDoc = snapshot.docs[0];
    const panditData = {
      id: panditDoc.id,
      ...panditDoc.data(),
      // Remove sensitive information if any
      password: undefined,
      private_notes: undefined
    };

    res.status(200).json({
      success: true,
      data: panditData
    });

  } catch (error) {
    console.error('Error fetching astrologer profile:', error);
    res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
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
  
      const panchangData = {
        Panchang:data?.Panchang,
        SunriseMoonrise:data?.SunriseMoonrise,
        Muhurat:data?.Muhurat
      };
  
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
const PORT = process.env.PORT || 8080;
const server=app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// require('./chat')(app, server);
require('./user/index')(app, server);


// APIs start for meetflow

app.post('/meetflow/user', async (req, res) => {
  try {
    const {
      email,
      name,
      picture,
      accessToken,
      tokenExpiry,
      refreshToken="yhj"  // Make sure to get this from req.body too
    } = req.body;

 

    // First check if user exists by email
    const usersRef = db.collection('meetflow_user_data');
    const userSnapshot = await usersRef
      .where('email', '==', email)
      .limit(1)
      .get();

    if (userSnapshot.empty) {
      // New user - Create new document
      await usersRef.add({
        email,
        name,
        tokenExpiry,
        picture,
        accessToken,
        refreshToken,  // Save refresh token for new users
        calendarUrl: generateCalendarUrl(name),
        lastUpdated: new Date(),
        createdAt: new Date()
      });

      res.json({
        success: true,
        message: 'New User saved'
      });
    } else {
      // Existing user - Always update tokens
      const userDoc = userSnapshot.docs[0];
      
      const updateData = {
        name,
        picture,
        lastUpdated: new Date()
      };

      // Only update tokens if they are present in the request
      if (accessToken) {
        console.log('update the token',accessToken);
        updateData.accessToken = accessToken;
      }


      await userDoc.ref.update(updateData);



      res.json({
        success: true,
        message: 'User updated successfully'
      });
    }
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Failed to register/update user',
      details: error.message
    });
  }
});

// Helper function to generate unique calendar URL
const generateCalendarUrl = (name) => {
  const cleanName = name.toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '');
  
  return `${cleanName}${Math.random().toString(36).substr(2, 6)}`;
};




app.post('/schedule-meeting', async (req, res) => {
  try {
    const {
      selectedDate="2025-01-30T18:30:00.000Z",
      selectedTime="6:00 PM",
      name="kap",
      email="vivekkumar7189@gmail.com",
      notes="dsdfs",
      timeZone='Asia/Calcutta',
    } = req.body;

    // Get user's token from Firestore
    const userSnapshot = await db.collection('meetflow_user_data')
    .where('email', '==', 'malik.vk07@gmail.com')
      .limit(1)
      .get();

    if (userSnapshot.empty) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const panditDoc = userSnapshot.docs[0];
    const userData = panditDoc.data();

    // Setup OAuth2 client
    // const oauth2Client = new google.auth.OAuth2(
    //   process.env.GOOGLE_CLIENT_ID,
    //   process.env.GOOGLE_CLIENT_SECRET,
    //   process.env.GOOGLE_REDIRECT_URI
    // );
    
    // oauth2Client.setCredentials({
    //   access_token: userData.accessToken,
    //   refresh_token: userData.refreshToken,
    //   expiry_date: userData.tokenExpiry
    // });

    const oauth2Client = new google.auth.OAuth2(
      '1087929121342-jr3oqd7f01s6hoel792lgdvka5prtvdq.apps.googleusercontent.com',
      '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',
      ''
    );
    console.log('userData hot 567',userData.accessToken);
  
    // Set credentials from Firestore
    oauth2Client.setCredentials({
      access_token: userData?.accessToken,
    });
    // Parse time
    const [timeStr, period] = selectedTime.split(' ');
    let [hours, minutes] = timeStr.split(':').map(Number);
    
    // Convert to 24-hour format
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    const startTime = new Date(selectedDate);
    startTime.setHours(hours, minutes, 0);
    const endTime = new Date(startTime);
    endTime.setHours(startTime.getHours() + 1);

    // Create calendar event
    const eventDetails = {
      summary: `Meeting with ${name}`,
      description: notes || 'No additional notes',
      start: {
        dateTime: startTime.toISOString(),
        timeZone: timeZone
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: timeZone
      },
      attendees: [{ email }],
      conferenceData: {
        createRequest: {
          requestId: Date.now().toString(),
          conferenceSolutionKey: { type: 'hangoutsMeet' }
        }
      },
      sendUpdates: 'all'
    };

    // Get fresh access token (in case it expired)
    const accessToken = userData?.accessToken;//'ya29.a0ARW5m748TMopC5IPqoNr-ZhLnQjxzSjktHWFLYFE1mXR7rIAqxhtE9Wd-B9_DVgZyaEfqOPK0-BMiWV88yJAWBnxViVdKt7_skc15At3i_v2Nb7MHSUrBPcS2XXzZ9fh1ycMpNs0GL1BvnAdvGpYjX9eBy2np_HZt5Oq15TMaCgYKAXwSARASFQHGX2MizVLNg9fl6da17k7p5IdjhQ0175'//await oauth2Client.getAccessToken();

    // Create calendar event using Calendar API
    const calendarResponse = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventDetails)
      }
    );

    if (!calendarResponse.ok) {
      const errorData = await calendarResponse.json();
      throw new Error(errorData.error?.message || 'Failed to create calendar event');
    }

    const eventData = await calendarResponse.json();

    // Prepare email content
    const emailContent = `
From: me
To: ${email}
Subject: Meeting Confirmation: Meeting with ${name}
Content-Type: text/html; charset=utf-8
MIME-Version: 1.0

<html>
  <body>
    <h2>Meeting Confirmation</h2>
    <p>Hello ${name},</p>
    <p>Your meeting has been scheduled successfully.</p>
    <p><strong>Date:</strong> ${startTime.toLocaleDateString()}</p>
    <p><strong>Time:</strong> ${selectedTime}</p>
    <p><strong>Meeting Link:</strong> ${eventData.hangoutLink || '--'}</p>
    <p><strong>Notes:</strong> ${notes || 'No additional notes'}</p>
    <p>The meeting has been added to your calendar. You will receive a calendar invitation separately.</p>
    <p>Best regards,<br>Your Meeting Scheduler</p>
  </body>
</html>`;

    // Encode email content
    const encodedEmail = Buffer.from(emailContent)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Send email using Gmail API
    const emailResponse = await fetch(
      'https://www.googleapis.com/gmail/v1/users/me/messages/send',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          raw: encodedEmail
        })
      }
    );

    if (!emailResponse.ok) {
      console.warn('Email sending failed, but meeting was created');
    }

    // Update token in Firestore if it was refreshed
    // if (accessToken.token !== userData.accessToken) {
    //   await panditDoc.ref.update({
    //     accessToken: accessToken.token,
    //     tokenExpiry: oauth2Client.credentials.expiry_date
    //   });
    // }

    // Send successful response
    res.json({
      success: true,
      data: {
        name,
        email,
        date: startTime.toLocaleDateString(),
        time: selectedTime,
        
      }
    });

  } catch (error) {
    console.error('Server Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to schedule meeting'
    });
  }
});
//app.post('/schedule-meeting', scheduleNewMeeting);
// APIs end for meetflow