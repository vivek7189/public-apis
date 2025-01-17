const express = require('express');
const multer = require('multer');
const { Storage } = require('@google-cloud/storage');
const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
//const { google } = require('googleapis');
const TokenService = require('./token/token');
//const EmailService = require('./email/email');
const cors = require('cors');
const fetch = require('node-fetch'); 

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

const tokenService = new TokenService(
  '1087929121342-jr3oqd7f01s6hoel792lgdvka5prtvdq.apps.googleusercontent.com',
  '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',
  db  // Pass the initialized db instance
);
// tokenMiddleware.js

//const emailService = new EmailService(tokenService);

// Use middleware in your routes





// app.get('/hello', async(req, res) => {
//   try {
//       // Get admin user data from database (sender's credentials)
//       const adminSnapshot = await db.collection('meetflow_user_data')
//           .where('email', '==', 'malik.vk07@gmail.com')  // Admin Gmail for authentication
//           .get();

//       if (adminSnapshot.empty) {
//           throw new Error('Admin user not found in database');
//       }

//       const adminUserData = {
//           ...adminSnapshot.docs[0].data(),
//           // Override the sending email to use custom domain
//           sendingEmail: 'welcome@vedbhakti.in'  // Replace with your custom domain
//       };

//       // Hardcoded recipient data for testing
//       const newUser = {
//           email: 'vivekkumar7189@gmail.com',
//           name: 'kapil Kumar'
//       };

//       // Send welcome email
//       await emailService.sendWelcomeEmail(
//           adminUserData,
//           newUser.email,
//           newUser.name
//       );

//       res.send('Hello, Cloud Run! Email sent successfully to ' + newUser.email);

//   } catch (error) {
//       console.error('Error in /hello endpoint:', error);
//       res.status(500).send('Error: ' + error.message);
//   }
// });

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
      email,  // Required
      name,
      picture,
      accessToken,
      refreshToken,
      tokenExpiryDate,
      tokenCreatedAt,
      lastTokenRefresh,
      tokenType,
      lastTokenRefreshDateTime
    } = req.body;

    // Validate required email
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    // First check if user exists by email
    const usersRef = db.collection('meetflow_user_data');
    const userSnapshot = await usersRef
      .where('email', '==', email)
      .limit(1)
      .get();

    if (userSnapshot.empty) {
      // New user - Create new document with all possible fields
      const newUserData = {
        email,
        calendarUrl: generateCalendarUrl(name, email),
        createdAt: new Date(),
        lastUpdated: new Date()
      };

      // Add optional fields if they exist
      if (name) newUserData.name = name;
      if (picture) newUserData.picture = picture;
      if (accessToken) newUserData.accessToken = accessToken;
      if (refreshToken) newUserData.refreshToken = refreshToken;
      if (tokenExpiryDate) newUserData.tokenExpiryDate = tokenExpiryDate;
      if (tokenCreatedAt) newUserData.tokenCreatedAt = tokenCreatedAt;
      if (lastTokenRefresh) newUserData.lastTokenRefresh = lastTokenRefresh;
      if (tokenType) newUserData.tokenType = tokenType; 
      if (lastTokenRefreshDateTime) newUserData.lastTokenRefreshDateTime = lastTokenRefreshDateTime;

      await usersRef.add(newUserData);

      res.json({
        success: true,
        message: 'New user created successfully'
      });
    } else {
      // Existing user - Update everything except calendarUrl
      const userDoc = userSnapshot.docs[0];
      const updateData = {
        lastUpdated: new Date()
      };

      // Add all optional fields if they exist in the request
      if (name) updateData.name = name;
      if (picture) updateData.picture = picture;
      if (accessToken) updateData.accessToken = accessToken;
      if (refreshToken) updateData.refreshToken = refreshToken;
      if (tokenExpiryDate) updateData.tokenExpiryDate = tokenExpiryDate;
      if (tokenCreatedAt) updateData.tokenCreatedAt = tokenCreatedAt;
      if (lastTokenRefresh) updateData.lastTokenRefresh = lastTokenRefresh;
      if (tokenType) updateData.tokenType = tokenType;
      if (lastTokenRefreshDateTime) newUserData.lastTokenRefreshDateTime = lastTokenRefreshDateTime;
      await userDoc.ref.update(updateData);

      res.json({
        success: true,
        message: 'User updated successfully'
      });
    }
  } catch (error) {
    console.error('User operation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process user operation',
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
      selectedDate,     // "2025-01-25"
      selectedTime,   // "6:00 PM"
      name,
      email,
      notes,
      timeZone = 'Asia/Calcutta',
      currentEmail
    } = req.body;

    // Log incoming request
    console.log('Received request:', { selectedDate, selectedTime, timeZone });

    // Get user token from Firestore
    const userSnapshot = await db.collection('meetflow_user_data')
      .where('email', '==', currentEmail)
      .limit(1)
      .get();

    if (userSnapshot.empty) {
      throw new Error('User not found');
    }

    const userData = userSnapshot.docs[0].data();

    // // Set up OAuth client
    // const oauth2Client = new google.auth.OAuth2(
    //   client_id,
    //   client_secret,
    //   ''
    // );
    // oauth2Client.setCredentials({
    //   refresh_token: userData.refreshToken
    // });

    // Parse time components
    const [timeStr, period] = selectedTime.split(' ');
    let [hours, minutes] = timeStr.split(':').map(Number);
    
    // Convert to 24-hour format
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    // Create date-time string and times
    const dateTimeString = `${selectedDate}T${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00.000`;
    const startTime = new Date(dateTimeString);
    const endTime = new Date(startTime);
    endTime.setHours(startTime.getHours() + 1);

    // Create calendar event details
    const eventDetails = {
      summary: `Meeting with ${name}`,
      description: notes || 'No additional notes',
      start: {
        dateTime: startTime.toISOString(),
        timeZone
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone
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
    const { accessToken } = await tokenService.getValidToken(userData);
    // Create calendar event
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

    // Create email content
    const emailContent = `Content-Type: text/html; charset=utf-8
MIME-Version: 1.0
From: malik.vk07@gmail.com
To: ${email}
Subject: Meeting Confirmation: Meeting with ${name}

<html>
  <body>
    <h2>Meeting Confirmation</h2>
    <p>Hello ${name},</p>
    <p>Your meeting has been scheduled successfully.</p>
    <p><strong>Date:</strong> ${startTime.toLocaleDateString('en-US', { timeZone })}</p>
    <p><strong>Time:</strong> ${selectedTime}</p>
    <p><strong>Time Zone:</strong> ${timeZone}</p>
    <p><strong>Meeting Link:</strong> ${eventData.hangoutLink || '--'}</p>
    <p><strong>Notes:</strong> ${notes || 'No additional notes'}</p>
    <p>The meeting has been added to your calendar. You will receive a calendar invitation separately.</p>
    <p>Best regards,<br>Your Meeting Scheduler</p>
  </body>
</html>`.replace(/\n/g, '\r\n');

    // Send email
    const encodedEmail = Buffer.from(emailContent)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

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

    // Send successful response
    res.json({
      success: true,
      data: {
        name,
        email,
        date: selectedDate,
        time: selectedTime,
        meetingLink: eventData.hangoutLink || '--'
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



app.post('/meetflow/calendar-events', async (req, res) => {
  try {
    const {
      date = "2025-01-17T18:30:00.000Z",
      email = "malik.vk07@gmail.com",
      fullMonth = false
    } = req.body;

    // Validate date
    const validDate = new Date(date);
    if (isNaN(validDate.getTime())) {
      throw new Error('Invalid date format');
    }

    // Get user from database
    const userSnapshot = await db.collection('meetflow_user_data')
      .where('email', '==', email)
      .limit(1)
      .get();

    if (userSnapshot.empty) {
      throw new Error('User not found');
    }

    const userData = userSnapshot.docs[0].data();

    // Set up time range based on fullMonth parameter
    let startDate, endDate;

    if (fullMonth) {
      // Get start and end of the month from the provided date
      startDate = new Date(validDate.getFullYear(), validDate.getMonth(), 1);
      endDate = new Date(validDate.getFullYear(), validDate.getMonth() + 1, 0, 23, 59, 59, 999);
    } else {
      // Use single day range
      startDate = new Date(validDate);
      startDate.setUTCHours(0, 0, 0, 0);
      
      endDate = new Date(validDate);
      endDate.setUTCHours(23, 59, 59, 999);
    }

    // Log time range for debugging
    console.log('Time range:', {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      isFullMonth: fullMonth
    });

    const { accessToken } = await tokenService.getValidToken(userData);

    // Fetch events from Google Calendar
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${startDate.toISOString()}&timeMax=${endDate.toISOString()}&singleEvents=true&orderBy=startTime`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to fetch events');
    }

    const data = await response.json();

    res.json({
      success: true,
      data: data.items || [],
      timeRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        isFullMonth: fullMonth
      }
    });

  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch events'
    });
  }
});
app.get('/meetflow/user', async (req, res) => {
  try {
    const { slug } = req.query; // username here is actually the full slug

    if (!slug) {
      return res.status(400).json({
        success: false,
        error: 'Slug is required'
      });
    }
    console.log('Querying with slug:', slug);

    // Direct query with the full slug
    const cleanSlug = decodeURIComponent(slug).replace(/"/g, '');
    console.log('Querying with clean slug:', cleanSlug);
    const userSnapshot = await db.collection('meetflow_user_event')
      .where('slug', '==', cleanSlug)
      .limit(1)
      .get();

    if (userSnapshot.empty) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    const eventDoc = userSnapshot.docs[0];
    const eventData = {
      id: eventDoc.id,
      ...eventDoc.data()
    };

    res.json({
      success: true,
      data: eventData
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch event'
    });
  }
});

// Event Type APIs
// Create Event API
app.post('/meetflow/eventcreate', async (req, res) => {
  try {
    const { title, duration, location, description, email } = req.body;
    
    if (!title || !duration || !location || !email) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }
    
    // Generate the slug
    const slug = `${email.split('@')[0]}/${title.toLowerCase().replace(/\s+/g, '-')}`;
    
    // Check if slug already exists
    const existingEventQuery = await db.collection('meetflow_user_event')
      .where('slug', '==', slug)
      .get();
    
    if (!existingEventQuery.empty) {
      return res.status(409).json({
        success: false,
        error: 'An event with this title already exists. Please choose a different title.'
      });
    }
    
    // Create event data
    const eventData = {
      title,
      duration,
      location,
      description,
      email,
      slug,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Let Firestore generate the ID
    const eventRef = await db.collection('meetflow_user_event').add(eventData);
    
    res.status(201).json({
      success: true,
      data: {
        id: eventRef.id,
        ...eventData
      }
    });
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create event'
    });
  }
});

// Fetch All Events API
app.get('/meetflow/events', async (req, res) => {
  try {
    const { email } = req.query;
 
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });  
    }
 
    // Simpler query without orderBy - will sort the results in memory instead
    const eventsSnapshot = await db.collection('meetflow_user_event')
      .where('email', '==', email)
      .get();
 
    // Get data and sort by createdAt in memory
    const events = eventsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })).sort((a, b) => {
      return new Date(b.createdAt) - new Date(a.createdAt); 
    });
 
    res.json({
      success: true, 
      data: events
    });
 
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch events'
    });
  }
 });

// Delete Event API
app.delete('/meetflow/eventdelete', async (req, res) => {
  try {
    const { eventId, email } = req.query;

    if (!eventId || !email) {
      return res.status(400).json({
        success: false,
        error: 'Event ID and email are required'
      });
    }

    // Get the event first to verify ownership
    const eventDoc = await db.collection('meetflow_user_event').doc(eventId).get();

    if (!eventDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    if (eventDoc.data().email !== email) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this event'
      });
    }

    // Delete the event
    await db.collection('meetflow_user_event').doc(eventId).delete();

    res.json({
      success: true,
      message: 'Event deleted successfully'
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete event'
    });
  }
});



