const express = require('express');
require('dotenv').config();
const multer = require('multer');
const { Storage } = require('@google-cloud/storage');
const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
//const { google } = require('googleapis');
const TokenService = require('./token/token');
const TokenManager = require('./token/token_manager');
const cors = require('cors');
const fetch = require('node-fetch'); 
// Using require (CommonJS)
const crypto = require('crypto');
const Razorpay = require('razorpay');
const axios = require('axios');
const app = express();
const emailService = require('./email-service/email');
app.use(cors());
app.use(express.json());



const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

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


app.get('/health', async(req, res) => {
  await emailService.sendWelcomeEmail({
    email: 'malik.vk07@gmail.com',
    name: 'John Doe'
  });
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
app.post('/meetflow/signup', async (req, res) => {
  try {
    const { email, phoneNumber, name, password } = req.body;

    // Validate required fields
    if (!email || !name || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide email, name and password'
      });
    }

    const usersRef = db.collection('meetflow_user_data');

    // Check if user already exists with this email
    const existingUserSnapshot = await usersRef
      .where('email', '==', email)
      .limit(1)
      .get();

    if (!existingUserSnapshot.empty) {
      return res.status(409).json({
        success: false,
        error: 'User with this email already exists'
      });
    }

    // Generate token set for new user
    const tokenManager = new TokenManager(db);
    const tokenData = await tokenManager.generateTokenSet();

    // Create customLogin object
    const customLogin = {
      name,
      picture: '', // Default empty
      calanderConnected: false, // Default false
      accessToken: tokenData.accessToken,
      tokenType: tokenData.tokenType,
      tokenExpiryDate: tokenData.tokenExpiryDate,
      lastLoginAt: new Date().toISOString(),
      password, // In production, hash this password before storing
      // Token management fields
      refreshToken: tokenData.refreshToken,
      refreshTokenCreatedAt: tokenData.refreshTokenCreatedAt,
      refreshTokenExpiryDate: tokenData.refreshTokenExpiryDate,
      lastTokenRefresh: tokenData.lastTokenRefresh
    };

    // Create new user document
    const newUserDoc = await usersRef.add({
      email,
      phoneNumber: phoneNumber || '', // Optional field
      customLogin
    });

    // Prepare response data
    const responseData = {
      userId: newUserDoc.id,
      email,
      phoneNumber: phoneNumber || '',
      customLogin: {
        ...customLogin,
        password: undefined // Remove password from response
      }
    };

    return res.status(201).json({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

app.post('/meetflow/login', async (req, res) => {
  try {
    const { email, phoneNumber, password, otp } = req.body;
    
    // Check for valid authentication pairs
    const isEmailPassword = email && password;
    const isPhoneOTP = phoneNumber && otp;
    
    // Validate exactly one authentication method is provided
    if (!isEmailPassword && !isPhoneOTP) {
      return res.status(400).json({
        success: false,
        error: 'Please provide either email + password OR phone number + OTP'
      });
    }
    
    if (isEmailPassword && isPhoneOTP) {
      return res.status(400).json({
        success: false,
        error: 'Please provide only one authentication method'
      });
    }
    
    const usersRef = db.collection('meetflow_user_data');
    let userSnapshot;
    
    // Query user based on auth method
    if (isEmailPassword) {
      userSnapshot = await usersRef
        .where('email', '==', email)
        .limit(1)
        .get();
    } else {
      userSnapshot = await usersRef
        .where('phoneNumber', '==', phoneNumber)
        .limit(1)
        .get();
    }
    
    // Check if user exists
    if (userSnapshot.empty) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const userDoc = userSnapshot.docs[0];
    const userData = userDoc.data();
    
    // Verify credentials based on auth method
    if (isEmailPassword) {
      if (userData.customLogin?.password !== password) {
        return res.status(401).json({
          success: false,
          error: 'Invalid password'
        });
      }
    }
    
    // Generate new token set after successful authentication
    //const tokenManager = new TokenManager(db);
    //const tokenData = await tokenManager.generateTokenSet();
    
    // Create customLogin object with null checks and default values
    // const customLogin = {
    //   name: userData.customLogin?.name || null,
    //   picture: userData.customLogin?.picture || null,
    //   calanderConnected: userData.customLogin?.calanderConnected || false,
    //   accessToken: tokenData.accessToken,
    //   tokenType: tokenData.tokenType,
    //   tokenExpiryDate: tokenData.tokenExpiryDate,
    //   lastLoginAt: new Date().toISOString(),
    //   // Token management fields inside customLogin
    //   refreshToken: tokenData.refreshToken,
    //   refreshTokenCreatedAt: tokenData.refreshTokenCreatedAt,
    //   refreshTokenExpiryDate: tokenData.refreshTokenExpiryDate,
    //   lastTokenRefresh: tokenData.lastTokenRefresh
    // };
    
    // Update user with new structure
    // await userDoc.ref.update({
    //   email: userData.email || null,
    //   customLogin
    // });
    
    // Prepare response data
    const responseData = {
      userId: userDoc.id,
      email: userData.email || null,
      phoneNumber: userData.phoneNumber || null,
    };
    
    return res.status(200).json({
      success: true,
      data: responseData
    });
    
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

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
      lastTokenRefreshDateTime,
      calanderConnected,
      password,
      provider,
      phone,
      gmailConnected
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
        lastUpdated: new Date(),
        availability: {
          weeklySchedule: {
            monday: [{ start: '9:00', end: '17:00' }],
            tuesday: [{ start: '9:00', end: '17:00' }],
            wednesday: [{ start: '9:00', end: '17:00' }],
            thursday: [{ start: '9:00', end: '17:00' }],
            friday: [{ start: '9:00', end: '17:00' }]
          },
          exceptionDates: []
        }
      };

      if (password) {
        const tokenManager = new TokenManager(db);
        const tokenData = await tokenManager.generateTokenSet();

        newUserData.customLogin = {
          email: email,
          provider:'custom',
          password: password,
          name: name || '', // Include name if available, empty string if not
          calanderConnected: false, // Default false
          accessToken: tokenData.accessToken,
          tokenType: tokenData.tokenType,
          tokenExpiryDate: tokenData.tokenExpiryDate,
          lastLoginAt: new Date().toISOString(),
          // Token management fields
          refreshToken: tokenData.refreshToken,
          refreshTokenCreatedAt: tokenData.refreshTokenCreatedAt,
          refreshTokenExpiryDate: tokenData.refreshTokenExpiryDate,
          lastTokenRefresh: tokenData.lastTokenRefresh
        };
      }

     
  
      // Create customLogin object


      // Add optional fields if they exist
      if (name) newUserData.name = name;
      if (phone) newUserData.phone = phone; 
      if (provider) newUserData.provider = provider;
      if (calanderConnected) newUserData.calanderConnected = calanderConnected; 
      if (picture) newUserData.picture = picture;
      if (accessToken) newUserData.accessToken = accessToken;
      if (refreshToken) newUserData.refreshToken = refreshToken;
      if (tokenExpiryDate) newUserData.tokenExpiryDate = tokenExpiryDate;
      if (tokenCreatedAt) newUserData.tokenCreatedAt = tokenCreatedAt;
      if (lastTokenRefresh) newUserData.lastTokenRefresh = lastTokenRefresh;
      if (tokenType) newUserData.tokenType = tokenType; 
      //if ('gmailConnected' in req.body) newUserData.gmailConnected = gmailConnected; 
      if (lastTokenRefreshDateTime) newUserData.lastTokenRefreshDateTime = lastTokenRefreshDateTime;

      if ('gmailConnected' in req.body) {
        const gmailAppData = {
          type: 'gmail',
          connected: gmailConnected,
          email: email,
          link: 'NA',
          lastUpdated: new Date().toISOString()
        };
        if (!newUserData.appsData) {
          newUserData.appsData = [];
        }
        // Add Gmail data to appsData array
        newUserData?.appsData.push(gmailAppData);
      }
      await usersRef.add(newUserData);

      
       emailService.sendWelcomeEmail({
        email,
        name
      });
      if(password){
        res.json({
          success: true,
          message: 'New user created successfully',
          data:newUserData
        });
      }else{
        res.json({
          success: true,
          message: 'New user created successfully'
        });
      }

    } else {
      // Existing user - Update everything except calendarUrl
      const userDoc = userSnapshot.docs[0];
      const updateData = {
        lastUpdated: new Date()
      };

      // Add all optional fields if they exist in the request
      if (name) updateData.name = name; 
      if (phone) updateData.phone = phone; 
      if (password) updateData.password = password;
      if (provider) updateData.provider = provider;
      if (calanderConnected) updateData.calanderConnected = calanderConnected; 
      if (picture) updateData.picture = picture;
      if (accessToken) updateData.accessToken = accessToken;
      if (refreshToken) updateData.refreshToken = refreshToken;
      if (tokenExpiryDate) updateData.tokenExpiryDate = tokenExpiryDate;
      if (tokenCreatedAt) updateData.tokenCreatedAt = tokenCreatedAt;
      if (lastTokenRefresh) updateData.lastTokenRefresh = lastTokenRefresh;
      if (tokenType) updateData.tokenType = tokenType;
      //if ('gmailConnected' in req.body) updateData.gmailConnected = gmailConnected; 
      if (lastTokenRefreshDateTime) updateData.lastTokenRefreshDateTime = lastTokenRefreshDateTime;

      if ('gmailConnected' in req.body) {
        const gmailAppData = {
          type: 'gmail',
          connected: gmailConnected,
          email: email,
          link: 'NA',
          lastUpdated: new Date().toISOString()
        };
        if (!updateData.appsData) {
          updateData.appsData = [];
        }
        // Add Gmail data to appsData array
        updateData?.appsData.push(gmailAppData);
      }
      await userDoc.ref.update(updateData);

      res.json({
        success: true,
        message: 'User updated successfully',
        data:{

        }
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




app.post('/meetingflow/eventdetails', async (req, res) => {
  try {
    const { id, email } = req.body;

    if (!email || !id) {
      return res.status(400).json({ error: 'Email and ID are required' });
    }

    const meetingsRef = db.collection('meetflow_user_meetings');
    const query = await meetingsRef
      .where('id', '==', id)
      .where('organizer.email', '==', email)
      .limit(1)
      .get();

    if (query.empty) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    const meetingDoc = query.docs[0];
    const meetingData = {
      id: meetingDoc.id,
      ...meetingDoc.data()
    };

    res.status(200).json(meetingData);

  } catch (error) {
    console.error('Error fetching meeting:', error);
    res.status(500).json({ error: error.message });
  }
});
app.post('/meetingflow/cancelevent', async (req, res) => {
  try {
    const { id, email } = req.body;
    if (!id || !email) return res.status(400).json({ error: 'Email and ID required' });

    // Get meeting from Firestore
    const query = await db.collection('meetflow_user_meetings')
      .where('id', '==', id)
      .where('organizer.email', '==', email)
      .limit(1)
      .get();

    if (query.empty) return res.status(404).json({ error: 'Meeting not found' });

    const meetingDoc = query.docs[0];
    const googleEventId = meetingDoc.data().id;

    const userSnapshot = await db.collection('meetflow_user_data')
    .where('email', '==', email)
    .limit(1)
    .get();
    
  if (userSnapshot.empty) {
    throw new Error('User not found');
  }

  const userData = userSnapshot.docs[0].data();

    // Cancel Google Calendar event
    const { accessToken } = await tokenService.getValidToken(userData);
    const googleResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}?sendUpdates=all`,
      {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }
    );

    if (!googleResponse.ok) throw new Error('Failed to cancel Google Calendar event');

    // Delete from Firestore
    await meetingDoc.ref.delete();
    res.status(200).json({ message: 'Meeting cancelled successfully' });

  } catch (error) {
    console.error('Cancel meeting error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/schedule-meeting', async (req, res) => {
  try {
    const {
      selectedDate="2025-01-23",
      selectedTime="3:45 PM",
      name="NA",
      email="vivekkumar7189@gmail.com",
      notes="ada",
      timeZone="Asia/Calcutta",
      currentEmail="malik.vk07@gmail.com",
      additionalEmails=[],
      phoneNumber = "+917042330092",
      eventID,
      rescheduleId,
    } = req.body;
    const userSnapshot = await db.collection('meetflow_user_data')
    .where('email', '==', currentEmail)
    .limit(1)
    .get();
    const userEventSnapshot = await db.collection('meetflow_user_event')
    .doc(eventID)
    .get();
    
  if (userSnapshot.empty) {
    throw new Error('User not found');
  }

  const userData = userSnapshot.docs[0].data();
  const userEventData = userEventSnapshot?.data();

  // Log the raw in

  // Parse time components
  const [timeStr, period] = selectedTime.split(' ');
  let [hours, minutes] = timeStr.split(':').map(Number);

  // Convert to 24-hour format
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;

  // Create a date object in the specified timezone using moment-timezone
  const moment = require('moment-timezone');
  
  // Format the time string
  const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  
  // Combine date and time and convert to specified timezone
  const dateTimeString = `${selectedDate} ${timeString}`;
  const meetingDateTime = moment.tz(dateTimeString, 'YYYY-MM-DD HH:mm', timeZone);
  const meetingEndTime = meetingDateTime.clone().add(1, 'hour');


  let meetingLinkFinal = userEventData?.location?.meetingLink || 'NA';
  if(userEventData?.location?.type === 'google-meet') {
    const { accessToken } = await tokenService.getValidToken(userData);

    // If it's a reschedule, cancel the previous event first

    if (rescheduleId) {
      const query = await db.collection('meetflow_user_meetings')
        .where('id', '==', rescheduleId)
        .where('organizer.email', '==', currentEmail)
        .limit(1)
        .get();
    
      if (query.empty) return res.status(404).json({ error: 'Meeting not found' });
      
      console.log('rescheduleData', rescheduleId);
      const meetingDoc = query.docs[0];
      const googleEventId = meetingDoc.data().id;
    
      try {
        // Try to delete from Google Calendar first
        const calendarResponse = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}?sendUpdates=all`,
          {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          }
        );
    
        if (!calendarResponse.ok) {
          throw new Error('Failed to delete event from Google Calendar');
        }
    
        // If calendar deletion was successful, delete from database
        await db.collection('meetflow_user_meetings').doc(meetingDoc.id).delete();
        console.log('Successfully deleted meeting from calendar and database');
    
      } catch (error) {
        console.error('Error in meeting cancellation:', error);
        throw new Error('Failed to cancel meeting: ' + error.message);
      }
    }

    const eventDetails = {
      summary: `Meeting with ${name}`,
      description: notes || 'No additional notes',
      start: {
        dateTime: meetingDateTime.format(),
        timeZone: timeZone
      },
      end: {
        dateTime: meetingEndTime.format(),
        timeZone: timeZone
      },
      attendees: [
        { email },
        ...additionalEmails.map(email => ({ email }))
      ],
      conferenceData: {
        createRequest: {
          requestId: Date.now().toString(),
          conferenceSolutionKey: { type: 'hangoutsMeet' }
        }
      },
      sendUpdates: 'all'
    };

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
    meetingLinkFinal = eventData?.hangoutLink;

    const meetingData = {
      id: eventData.id,
      googleCalendarEventId: eventData.id, // Store this for future rescheduling
      summary: `Meeting with ${name}`,
      description: notes || '',
      start: {
        dateTime: meetingDateTime.format(),
        timeZone: timeZone
      },
      end: {
        dateTime: meetingEndTime.format(),
        timeZone: timeZone
      },
      meetingLink: meetingLinkFinal,
      meetingType: userEventData?.location?.type,
      htmlLink: eventData.htmlLink,
      status: 'confirmed',
      attendees: [
        { email },
        ...additionalEmails.map(email => ({ email }))
      ],
      creator: { email: currentEmail },
      organizer: { email: currentEmail },
      eventID,
      attendeName: name,
      attednePhone: phoneNumber || 'NA',
      meetingNotes: notes,
      eventNameTitle: userEventData?.title,
      eventSlug: userEventData?.slug,
      meetingDuration: userEventData?.duration
    };

    await saveMeeting(meetingData);

    // Prepare email content based on whether it's a reschedule or new meeting
    const emailSubject = rescheduleId ? 'Meeting Rescheduled' : 'Meeting Confirmation';
    const emailContent = `Content-Type: text/html; charset=utf-8
MIME-Version: 1.0
From: ${currentEmail}
To: ${email}
Cc: ${additionalEmails.join(', ')}
Subject: ${emailSubject}

<html>
<head>
  <style>
    .button {
      display: inline-block;
      padding: 10px 20px;
      margin: 10px 10px 10px 0;
      border-radius: 5px;
      text-decoration: none;
      font-family: Arial, sans-serif;
      font-size: 14px;
      font-weight: bold;
    }
    .reschedule-btn {
      background-color: #4F46E5;
      color: white !important;
    }
    .cancel-btn {
      background-color: #DC2626;
      color: white !important;
    }
  </style>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <h2 style="color: #1F2937;">${emailSubject}</h2>
  <p>Hello ${name},</p>
  ${rescheduleId
    ? `<p>Your meeting has been rescheduled to the following time:</p>`
    : `<p>Your meeting has been scheduled successfully.</p>`
  }
  <div style="background-color: #F3F4F6; padding: 15px; border-radius: 8px; margin: 20px 0;">
    <p style="margin: 5px 0;"><strong>Date:</strong> ${meetingDateTime.format('LL')}</p>
    <p style="margin: 5px 0;"><strong>Time:</strong> ${meetingDateTime.format('LT')} ${timeZone}</p>
    <p style="margin: 5px 0;"><strong>Time Zone:</strong> ${timeZone}</p>
    <p style="margin: 5px 0;"><strong>Meeting Link:</strong> <a href="${meetingLinkFinal || '#'}" style="color: #4F46E5;">${meetingLinkFinal || '--'}</a></p>
    <p style="margin: 5px 0;"><strong>Notes:</strong> ${notes || 'No additional notes'}</p>
  </div>
  
  <div style="margin: 25px 0;">
    <a href="https://www.meetsynk.com/${userEventData?.slug}?rescheduleId=${eventData.id}" 
       class="button reschedule-btn" 
       style="background-color: #4F46E5; color: white; text-decoration: none;">
      Reschedule Meeting
    </a>
    <a href="https://www.meetsynk.com/${userEventData?.slug}?rescheduleId=${eventData.id}" 
       class="button cancel-btn" 
       style="background-color: #DC2626; color: white; text-decoration: none;">
      Cancel Meeting
    </a>
  </div>

  ${rescheduleId
    ? `<p>The previous meeting has been canceled and a new calendar invitation will be sent shortly.</p>`
    : `<p>The meeting has been added to your calendar. You will receive a calendar invitation separately.</p>`
  }
  
  <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #E5E7EB;">
    Best regards,<br>
    Your Meeting Scheduler
  </p>
</body>
</html>`.replace(/\n/g, '\r\n');

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
  }else {
    const emailData = {
      email,
      name,
      meetingDateTime,
      timeZone,
      notes,
      meetingLink: meetingLinkFinal,
      meetingType: userEventData?.location?.type,
      eventSlug: userEventData?.slug,
      eventId: eventData?.id,
      eventTitle: userEventData?.title,
      ...(rescheduleId && { rescheduleId }), // Only adds rescheduleId if it exists
      ...(eventData?.hangoutLink && { hangoutLink: eventData.hangoutLink }) // Only adds hangoutLink if it exists
    };
    
    await emailService.sendMeetingInviteEmail(emailData);
    const meetingDataNonG = {
      id: Date.now().toString(),
      summary: `Meeting with ${name}`,
      description: notes || '',
      start: {
        dateTime: meetingDateTime.format(),
        timeZone: timeZone
      },
      end: {
        dateTime: meetingEndTime.format(),
        timeZone: timeZone
      },
      meetingLink: meetingLinkFinal,
      meetingType:userEventData?.location?.type,
      htmlLink: null,
      status: 'confirmed',
      attendees: [
        { email },
        ...additionalEmails.map(email => ({ email }))
      ],
      creator: { email: currentEmail },
      organizer: { email: currentEmail },
      eventID,
      attendeName:name,
      attednePhone:phoneNumber || 'NA',
      meetingNotes:notes,
      eventNameTitle:userEventData?.title,
      eventSlug:userEventData?.slug,
      meetingDuration:userEventData?.duration
    };
    console.log('userEventData?.slug22',userEventData?.slug)
    await saveMeeting(meetingDataNonG);
  }
   
    //end email from meetsynk 

    /// email gmail send END
    if (phoneNumber) {
      const meetingDetails = {
        name,
        phoneNumber,
        meetingDateTime: meetingDateTime.toDate(),
        meetingLink: meetingLinkFinal,
        timeZone
      };
      await sendWhatsAppMessage(meetingDetails)
      //scheduleWhatsAppReminder(meetingDetails);
    }
    if (phoneNumber) {
      // Create reminder in Google Apps Script
      const googleScriptUrl = 'https://script.google.com/macros/s/AKfycbzo8p2RSxZ1vX-BklOOfap5Ee_UZi86dTRGnA3pMwJW9muOZsdkZ5GqlrVRycewsGQfOA/exec';
    
    // Prepare payload for Google Apps Script
    const scriptPayload = {
      selectedDate,
      selectedTime,
      name,
      email,
      notes,
      timeZone,
      currentEmail,
      phoneNumber,
      timestamp: new Date().toISOString(),
      source: 'Node.js API'
    };

    // Trigger Google Apps Script
    const scriptResponse = await fetch(googleScriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(scriptPayload)
    });
    const text = await scriptResponse.text(); // Get raw response text
    //console.log('Raw Response:', text);
    }
    // Send successful response
    res.json({
      success: true,
      data: {
        name,
        email,
        date: selectedDate,
        time: selectedTime,
        meetingLink: 'NA'
      }
    });

  } catch (error) {
    console.error(rescheduleId ? 'Reschedule Error:' : 'Scheduling Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || `Failed to ${rescheduleId ? 'reschedule' : 'schedule'} meeting`
    });
  }
});

// {email,name,meetingDateTime,timeZone,notes,hangoutLink:meetingLinkFinal}
const saveMeeting = async (eventData) => {
  await db.collection('meetflow_user_meetings').add({
    id: eventData?.id || Date.now().toString(),
    summary: eventData?.summary || 'Untitled Meeting',
    description: eventData?.description || '',
    start: eventData?.start || { dateTime: new Date().toISOString() },
    end: eventData?.end || { dateTime: new Date().toISOString() },
    meetingLink: eventData?.meetingLink || 'NA',
    htmlLink: eventData?.htmlLink || null,
    status: eventData?.status || 'confirmed',
    attendees: Array.isArray(eventData?.attendees) ? eventData.attendees : [],
    creator: eventData?.creator || {},
    organizer: eventData?.organizer || {},
    createdAt: new Date(),
    source: 'meetsynk',
    eventID:eventData?.eventID,
    attendeName:eventData.attendeName,
    attednePhone:eventData.attednePhone || 'NA',
    meetingNotes:eventData.meetingNotes,
    eventNameTitle:eventData?.eventNameTitle,
    eventSlug:eventData?.eventSlug,
    meetingDuration:eventData?.meetingDuration,
    meetingType:eventData?.meetingType
  });
 };

 app.post('/meetflow/meetings', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    const meetings = await db.collection('meetflow_user_meetings')
      .where('organizer.email', '==', email)  // Changed to use organizer.email
      .orderBy('createdAt', 'desc')
      .get();

    const meetingsData = meetings.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({
      success: true,
      data: meetingsData
    });

  } catch (error) {
    console.error('Error fetching meetings:', error);
    
    // Check if it's an index error
    if (error.code === 'failed-precondition' && error.message.includes('requires an index')) {
      return res.status(500).json({
        success: false,
        error: 'Database index not ready. Please create an index for organizer.email and createdAt fields',
        details: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch meetings'
    });
  }
});

function getMonthRange(dateString) {
  const date = new Date(dateString);
  
  return {
    start: `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-01T00:00:00.000Z`,
    end: `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${new Date(date.getUTCFullYear(), date.getUTCMonth() + 1, 0).getDate()}T23:59:59.999Z`,
    isFullMonth: true
  };
 }
 
 app.post('/meetflow/calendar-events', async (req, res) => {
  try {
    const { 
      date='2024-12-31T18:30:00.000Z', 
      email = "malik.vk07@gmail.com", 
      fullMonth = true 
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
 
    // Get time range
    const timeRange = fullMonth ? 
      getMonthRange(validDate) : 
      {
        start: new Date(validDate.setUTCHours(0, 0, 0, 0)).toISOString(),
        end: new Date(validDate.setUTCHours(23, 59, 59, 999)).toISOString(),
        isFullMonth: false
      };
 
    // Log time range for debugging
    console.log('Time range:', timeRange);
 
    const { accessToken } = await tokenService.getValidToken(userData);
 
    // Fetch events from Google Calendar
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeRange.start}&timeMax=${timeRange.end}&singleEvents=true&orderBy=startTime`,
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
      timeRange
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
    const { slug, slugID } = req.query;

    let userSnapshot;

    if (slugID) {
      // If slugID is provided, query by document ID
      const eventDoc = await db.collection('meetflow_user_event')
        .doc(slugID)
        .get();

      if (!eventDoc.exists) {
        return res.status(404).json({
          success: false,
          error: 'Event not found'
        });
      }

      userSnapshot = { docs: [eventDoc] };
    } else {
      // If no slugID, use original slug query
      if (!slug) {
        return res.status(400).json({
          success: false,
          error: 'Slug or slugID is required'
        });
      }

      console.log('Querying with slug:', slug);
      const cleanSlug = decodeURIComponent(slug).replace(/"/g, '');
      console.log('Querying with clean slug:', cleanSlug);
      
      userSnapshot = await db.collection('meetflow_user_event')
        .where('slug', '==', cleanSlug)
        .limit(1)
        .get();

      if (userSnapshot.empty) {
        return res.status(404).json({
          success: false,
          error: 'Event not found'
        });
      }
    }

    // Rest of the code remains the same
    const eventDoc = userSnapshot.docs[0];
    const eventData = eventDoc.data();

    // Fetch availability data
    const userDataSnapshot = await db.collection('meetflow_user_data')
      .where('email', '==', eventData.email)
      .limit(1)
      .get();

    let availabilityData = {};
    if (!userDataSnapshot.empty) {
      const userData = userDataSnapshot.docs[0].data();
      availabilityData = userData.availability || {};
    }

    res.json({
      success: true,
      data: {
        id: eventDoc.id,
        ...eventData,
        availability: availabilityData
      }
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
    const { title, duration, location, description, email,reminders = {
      whatsapp: {
        enabled: false,
        timing: 15
      }
    } } = req.body;
    
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


app.get('/meetflow/availability', async (req, res) => {
  try {
    const currentEmail = req.query.email;
    
    if (!currentEmail) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    // Get user from existing meetflow_user_data collection
    const userSnapshot = await db.collection('meetflow_user_data')
      .where('email', '==', currentEmail)
      .limit(1)
      .get();

    if (userSnapshot.empty) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const userData = userSnapshot.docs[0].data();

    // If no availability settings exist, return default settings
    if (!userData.availability) {
      return res.json({
        success: true,
        data: {
          weeklySchedule: {
            monday: [{ start: '9:00', end: '17:00' }],
            tuesday: [{ start: '9:00', end: '17:00' }],
            wednesday: [{ start: '9:00', end: '17:00' }],
            thursday: [{ start: '9:00', end: '17:00' }],
            friday: [{ start: '9:00', end: '17:00' }]
          },
          exceptionDates: []
        }
      });
    }

    // Return existing availability settings from user data
    return res.json({
      success: true,
      data: {
        weeklySchedule: userData.availability.weeklySchedule || {},
        exceptionDates: userData.availability.exceptionDates || []
      }
    });

  } catch (error) {
    console.error('Error fetching availability:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch availability settings'
    });
  }
});

// POST endpoint to save availability settings
app.post('/meetflow/availability', async (req, res) => {
  try {
    const { weeklySchedule, exceptionDates, currentEmail } = req.body;

    if (!currentEmail) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    // Validate schedule data
    if (!weeklySchedule || typeof weeklySchedule !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Invalid weekly schedule format'
      });
    }

    // Validate exceptionDates is an array of valid dates
    if (!Array.isArray(exceptionDates)) {
      return res.status(400).json({
        success: false,
        error: 'Exception dates must be an array'
      });
    }

    // Get user document reference
    const userSnapshot = await db.collection('meetflow_user_data')
      .where('email', '==', currentEmail)
      .limit(1)
      .get();

    if (userSnapshot.empty) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const userDocRef = userSnapshot.docs[0].ref;

    // Update the existing user document with availability settings
    await userDocRef.update({
      'availability': {
        weeklySchedule,
        exceptionDates,
        updatedAt: new Date().toISOString()
      }
    });

    return res.json({
      success: true,
      message: 'Availability settings saved successfully'
    });

  } catch (error) {
    console.error('Error saving availability:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to save availability settings'
    });
  }
});


async function sendWhatsAppMessage(data) {
  console.log('whatapp datta',data);
  const {phoneNumber, meeting="Meet with vivek", time="2:00 PM EST", joinUrl="https://meet.google.com/abc-defg-hij",notes='NA'}=data;
  try {
    const response = await fetch(
      'https://graph.facebook.com/v21.0/498417126696075/messages',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: phoneNumber,
          type: "template",
          template: {
            name: "event_details_reminder_2", // Your approved template name
            language: {
              code: "en_US"
            },
            components: [
              {
                type: "body",
                parameters: [
                  {
                    type: "text",
                    text: meeting
                  },
                  {
                    type: "text",
                    text: time
                  },
                  {
                    type: "text",
                    text: joinUrl
                  }
                ]
              }
            ]
          }
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to send WhatsApp message');
    }

    const data = await response.json();
    console.log('WhatsApp message sent successfully:', data);
    return data;
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    throw error;
  }
}

// Usage example:
// sendWhatsAppMessage(
//   "1234567890",
//   "Weekly Team Sync",
//   "2:00 PM EST",
//   "https://meet.google.com/abc-defg-hij"
// );



app.post('/reminder', async (req, res) => {
  try {
    // Log received payload
    console.log('Health endpoint received:', req.body);

    // Extract phone number and message from request body
    const { phoneNumber, message } = req.body;

    // Validate input
    if (!phoneNumber) {
      return res.status(400).json({
        status: 'error',
        message: 'Phone number is required'
      });
    }

    // Send message using your custom sendMessage function
    await sendWhatsAppMessage(req.body);


    // Respond with success
    res.json({
      status: 'success',
      message: 'Reminder sent',
      phoneNumber: phoneNumber
    });

  } catch (error) {
    console.error('Health endpoint error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to send reminder',
      details: error.message
    });
  }
});



// zoom integartion

// Basic Zoom Integration APIs

// 1. Connect Zoom Account
app.post('/meetflow/zoom/connect', async (req, res) => {
  try {
    const { code, email } = req.body; // Changed from req.body to req.query for GET request

    // Validate input parameters
    if (!code) {
      return res.status(400).json({ error: 'Missing authorization code' });
    }

    // Exchange code for token
    const tokenResponse = await fetch('https://zoom.us/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(
          `${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`
        ).toString('base64')}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: 'https://www.meetsynk.com/apps',
        scope: 'user:read' // Add the appropriate scope
      })
    });

    const tokenData = await tokenResponse.json();

    // Check for token exchange errors
    if (tokenData.error) {
      console.error('Token Exchange Error:', tokenData);
      return res.status(400).json({ 
        error: 'Failed to exchange authorization code',
        details: tokenData.error_description || 'Unknown error'
      });
    }

    // Get Zoom user info
    const userResponse = await fetch('https://api.zoom.us/v2/users/me', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`
      }
    });

    const zoomUserData = await userResponse.json();

    // Prepare data for Firestore
    const integrationData = {
      // User identification
      email: zoomUserData.email || email, // Fallback to provided email if not in Zoom data
      zoomUserId: zoomUserData.id,
      zoomAccountId: zoomUserData.account_id,
      
      // Token information
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresIn: tokenData.expires_in,
      tokenType: tokenData.token_type,
      scope: tokenData.scope,
      
      // User profile information
      firstName: zoomUserData.first_name,
      lastName: zoomUserData.last_name,
      displayName: zoomUserData.display_name,
      role: zoomUserData.role_name,
      timezone: zoomUserData.timezone,
      
      // Additional metadata
      personalMeetingUrl: zoomUserData.personal_meeting_url,
      status: zoomUserData.status,
      
      // Timestamps
      createdAt: new Date(),
      updatedAt: new Date()
    };
   
    // Save to Firestore
    await db.collection('meetflow_zoom_integrations').doc(zoomUserData.email).set(
      integrationData,
      { merge: true } // Use merge to allow updating existing documents
    );
    const usersRef = db.collection('meetflow_user_data');
    const userSnapshot = await usersRef
      .where('email', '==', email)
      .limit(1)
      .get();
      const userDoc = userSnapshot.docs[0];
      const zoomAppData = {
        type: 'zoom',
        connected: true,
        link: integrationData?.personalMeetingUrl,
        email: zoomUserData.email,
        lastUpdated: new Date().toISOString()
      };
  
      // Use arrayUnion to push to appsData array
      await userDoc.ref.update({
        appsData: FieldValue.arrayUnion(zoomAppData)
      });

    // Respond with success and key information
    res.json({
      success: true,
      email: zoomUserData.email,
      userId: zoomUserData.id,
      displayName: zoomUserData.display_name
    });

  } catch (error) {
    console.error('Zoom Connection Error:', error);
    
    // More detailed error response
    res.status(500).json({ 
      error: 'Failed to connect Zoom account',
      message: error.message,
      details: error.toString()
    });
  }
});


app.post('/meetflow/apps/data', async (req, res) => {
  try {
    const { app, action, email, appData } = req.body;

    if (!action || !email) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: app, action, and email are required'
      });
    }

    const usersRef = db.collection('meetflow_user_data');
    const userSnapshot = await usersRef
      .where('email', '==', email)
      .limit(1)
      .get();

    if (userSnapshot.empty) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const userDoc = userSnapshot.docs[0];
    const userData = userDoc.data();

    switch (action) {
      case 'add':
        if (!appData) {
          return res.status(400).json({
            success: false,
            error: 'appData is required for add action'
          });
        }

        let existingAppsData = userData.appsData || [];
        const existingAppIndex = existingAppsData.findIndex(
          existingApp => existingApp.type === app
        );

        if (existingAppIndex !== -1) {
          // Merge with existing app data
          existingAppsData[existingAppIndex] = {
            ...existingAppsData[existingAppIndex],
            ...appData,
            connected:true,
            lastUpdated: new Date().toISOString()
          };
        } else {
          // Add new app data
          existingAppsData.push({
            ...appData,
            type: app,
            connected:true,
            lastUpdated: new Date().toISOString()
          });
        }

        // Update the document
        await userDoc.ref.update({
          appsData: existingAppsData
        });

        // Get the updated document to return latest data
        const addUpdatedDoc = await userDoc.ref.get();
        const addUpdatedData = addUpdatedDoc.data();

        return res.status(200).json({
          success: true,
          message: `${app} integration updated successfully`,
          appsData: addUpdatedData.appsData || []
        });

      case 'del':
        // If appsData doesn't exist, return empty array
        if (!userData.appsData) {
          return res.status(200).json({
            success: true,
            message: 'No apps data to delete',
            appsData: []
          });
        }

        // Filter out the app to be deleted
        const updatedAppsData = userData.appsData.filter(
          appData => appData.type !== app
        );

        // Update the document
        await userDoc.ref.update({
          appsData: updatedAppsData
        });

        // If it's zoom, also delete from zoom integrations collection
        if (app === 'zoom') {
          const zoomApp = userData.appsData.find(a => a.type === 'zoom');
          if (zoomApp) {
            await db.collection('meetflow_zoom_integrations').doc(zoomApp.email).delete();
          }
        }

        // Get the updated document to return latest data
        const delUpdatedDoc = await userDoc.ref.get();
        const delUpdatedData = delUpdatedDoc.data();

        return res.status(200).json({
          success: true,
          message: `${app} integration removed successfully`,
          appsData: delUpdatedData.appsData || []
        });

      case 'status':
        return res.status(200).json({
          success: true,
          connected: !!userData.appsData?.find(a => a.type === app),
          appsData: userData.appsData || []
        });

      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid action specified'
        });
    }
  } catch (error) {
    console.error('Error handling apps data:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});
app.post('/meetflow/appdata', async (req, res) => {
  try {
    const { email } = req.body;

    // Validate email in request body
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required in request body'
      });
    }

    // Reference to users collection
    const usersRef = db.collection('meetflow_user_data');
    
    // Query for user with matching email
    const userSnapshot = await usersRef
      .where('email', '==', email)
      .limit(1)
      .get();

    // Check if user exists
    if (userSnapshot.empty) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Get user data
    const userData = userSnapshot.docs[0].data();

    // Return apps data
    return res.status(200).json({
      success: true,
      data: userData.appsData || [],
      message: 'Apps data retrieved successfully'
    });

  } catch (error) {
    console.error('Error retrieving apps data:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});
// 2. Check Connection Status
app.get('/meetflow/zoom/status', async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const integrationDoc = await db.collection('meetflow_zoom_integrations')
      .doc(email)
      .get();

    if (!integrationDoc.exists) {
      return res.json({ isConnected: false });
    }

    const integrationData = integrationDoc.data();

    res.json({
      isConnected: true,
      email: integrationData.zoomEmail,
      name: `${integrationData.firstName} ${integrationData.lastName}`
    });

  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({ error: 'Failed to check connection status' });
  }
});



app.post('/meetflow/billing', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    // Find user document
    const usersRef = db.collection('meetflow_user_data');
    const userSnapshot = await usersRef
      .where('email', '==', email)
      .limit(1)
      .get();

    if (userSnapshot.empty) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const userData = userSnapshot.docs[0].data();
    
    // Get billing object from user data
    const billingData = userData.billing || {
      currentPlan: 'free',
      status: 'active',
      nextBillingDate:'NA',
      lastPaymentDate:'NA',
      lastUpdated: new Date().toISOString()
    };

    return res.status(200).json({
      success: true,
      billing: billingData
    });

  } catch (error) {
    console.error('Error fetching billing data:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});


app.post('/meetflow/calendar-analysis', async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      email = "malik.vk07@gmail.com"
    } = req.body;

    // Validate dates
    const validStartDate = new Date(startDate);
    const validEndDate = new Date(endDate);

    if (isNaN(validStartDate.getTime()) || isNaN(validEndDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format'
      });
    }

    // Ensure startDate is before endDate
    if (validStartDate > validEndDate) {
      return res.status(400).json({
        success: false,
        error: 'Start date must be before end date'
      });
    }

    // Get user from database
    const userSnapshot = await db.collection('meetflow_user_data')
      .where('email', '==', email)
      .limit(1)
      .get();

    if (userSnapshot.empty) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const userData = userSnapshot.docs[0].data();

    // Format dates for Google Calendar API
    const timeMin = validStartDate.toISOString();
    const timeMax = validEndDate.toISOString();

    // Get valid access token
    const { accessToken } = await tokenService.getValidToken(userData);

    // Fetch events from Google Calendar
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
      `timeMin=${timeMin}&timeMax=${timeMax}&` +
      `singleEvents=true&orderBy=startTime`,
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

    const calendarData = await response.json();

    // Process and analyze the calendar data
    const analyzedData = analyzeCalendarData(calendarData.items);

    return res.status(200).json({
      success: true,
      data: {
        timeRange: {
          start: timeMin,
          end: timeMax
        },
        analysis: analyzedData,
        rawEvents: calendarData.items
      }
    });

  } catch (error) {
    console.error('Calendar analysis error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

// Helper function to analyze calendar data
function analyzeCalendarData(events) {
  // Skip events without proper datetime
  const validEvents = events.filter(event => 
    event.start?.dateTime && event.end?.dateTime
  );

  // Group events by hour of day
  const hourlyDistribution = {};
  for (let i = 0; i < 24; i++) {
    hourlyDistribution[i] = 0;
  }

  // Analyze meeting patterns
  const analysis = {
    totalMeetings: validEvents.length,
    averageDuration: 0,
    hourlyDistribution,
    weekdayDistribution: {
      0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 // Sunday to Saturday
    },
    mostCommonDuration: 0,
    mostPopularHour: null,
    meetingTypes: {}
  };

  let totalDuration = 0;
  const durationFrequency = {};

  validEvents.forEach(event => {
    const startTime = new Date(event.start.dateTime);
    const endTime = new Date(event.end.dateTime);
    const duration = (endTime - startTime) / (1000 * 60); // Duration in minutes
    
    // Track duration
    totalDuration += duration;
    durationFrequency[duration] = (durationFrequency[duration] || 0) + 1;

    // Track hour distribution
    const hour = startTime.getHours();
    analysis.hourlyDistribution[hour]++;

    // Track weekday distribution
    const weekday = startTime.getDay();
    analysis.weekdayDistribution[weekday]++;

    // Track meeting types (based on summary/title patterns)
    const type = categorizeMeeting(event.summary);
    analysis.meetingTypes[type] = (analysis.meetingTypes[type] || 0) + 1;
  });

  // Calculate averages and most common patterns
  if (validEvents.length > 0) {
    analysis.averageDuration = totalDuration / validEvents.length;
    analysis.mostCommonDuration = Object.entries(durationFrequency)
      .sort((a, b) => b[1] - a[1])[0]?.[0];
    analysis.mostPopularHour = Object.entries(analysis.hourlyDistribution)
      .sort((a, b) => b[1] - a[1])[0]?.[0];
  }

  return analysis;
}

// Helper function to categorize meetings based on title
function categorizeMeeting(summary = '') {
  const lowercase = summary.toLowerCase();
  if (lowercase.includes('1:1') || lowercase.includes('one on one')) {
    return '1:1';
  }
  if (lowercase.includes('team') || lowercase.includes('standup')) {
    return 'Team Meeting';
  }
  if (lowercase.includes('interview') || lowercase.includes('hiring')) {
    return 'Interview';
  }
  if (lowercase.includes('client') || lowercase.includes('customer')) {
    return 'Client Meeting';
  }
  return 'Other';
}


// payment

// app.post('/meetsynk/razorpay/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
//   try {
//       // Verify webhook signature
//       const signature = req.headers['x-razorpay-signature'];
//       const shasum = crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET);
//       shasum.update(JSON.stringify(req.body));
//       const digest = shasum.digest('hex');

//       if (digest !== signature) {
//           return res.status(400).json({ error: 'Invalid signature' });
//       }

//       // Create simplified payment document
//       const paymentDoc = {
//           fullPayload: req.body,
//           webhookReceivedAt: new Date(),
//           event: req.body.event,
//           status: req.body.payload.payment?.entity?.status || null,
//           email: req.body.payload.payment?.entity?.email || null
//       };

//       // Store in meetsynk_payment collection
//       await db.collection('meetsynk_payment').add(paymentDoc);

//       res.json({ status: 'ok' });

//   } catch (error) {
//       console.error('Webhook error:', error);
//       res.status(500).json({ error: 'Internal server error' });
//   }
// });

app.post('/meetsynk/razorpay/create-order', async (req, res) => {
  try {
    const { amount, currency = 'INR', planId, email } = req.body;
    const amountInPaise = Math.round(Number(amount) * 100);

    console.log('Creating order with amount:', {
      originalAmount: amount,
      amountInPaise: amountInPaise
    });

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount: amountInPaise, // convert to paise
      currency,
      receipt: `rcpt_${Date.now()}`,
      notes: {
        planId,
        email
      }
    });

    // Store order in database
    await db.collection('meetsynk_orders').add({
      orderId: order.id,
      amount: amount * 100,
      currency,
      planId,
      email,
      status: 'created',
      createdAt: new Date()
    });

    res.json({ 
      success: true, 
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency
      }
    });

  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create order' 
    });
  }
});

// 2. Verify Payment API
app.post('/meetsynk/razorpay/verify', async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      planId
    } = req.body;

    // Verify signature
    const shasum = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
    shasum.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const digest = shasum.digest('hex');

    if (digest !== razorpay_signature) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid signature' 
      });
    }

    // Get order details from database
    const orderSnapshot = await db.collection('meetsynk_orders')
      .where('orderId', '==', razorpay_order_id)
      .limit(1)
      .get();

    if (orderSnapshot.empty) {
      return res.status(404).json({ 
        success: false, 
        error: 'Order not found' 
      });
    }

    const orderDoc = orderSnapshot.docs[0];
    const orderData = orderDoc.data();

    // Create payment record
    const paymentDoc = {
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
      planId,
      email: orderData.email,
      amount: orderData.amount,
      status: 'verified',
      verifiedAt: new Date()
    };

    await db.collection('meetsynk_payment').add(paymentDoc);

    // Update order status
    await orderDoc.ref.update({
      status: 'paid',
      paymentId: razorpay_payment_id,
      updatedAt: new Date()
    });

    // Update user subscription
    await updateUserSubscription(orderData.email, planId);

    res.json({ 
      success: true, 
      message: 'Payment verified successfully' 
    });

  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Payment verification failed' 
    });
  }
});

// 3. Webhook Handler (your existing code with some enhancements)
app.post('/meetsynk/razorpay/webhook', 
  express.raw({ type: 'application/json' }), 
  async (req, res) => {
    try {
      // Verify webhook signature
      const signature = req.headers['x-razorpay-signature'];
      const shasum = crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET);
      shasum.update(JSON.stringify(req.body));
      const digest = shasum.digest('hex');

      if (digest !== signature) {
        return res.status(400).json({ error: 'Invalid signature' });
      }

      const event = req.body.event;
      const payment = req.body.payload.payment?.entity;

      // Create simplified payment document
      const paymentDoc = {
        fullPayload: req.body,
        webhookReceivedAt: new Date(),
        event,
        orderId: payment?.order_id,
        paymentId: payment?.id,
        status: payment?.status || null,
        email: payment?.email || null,
        amount: payment?.amount,
        currency: payment?.currency
      };

      // Store in meetsynk_payment collection
      await db.collection('meetsynk_payment').add(paymentDoc);

      // Handle specific events
      if (event === 'payment.captured') {
        // Update order status
        const orderRef = db.collection('meetsynk_orders')
          .where('orderId', '==', payment.order_id);
        
        const orderSnapshot = await orderRef.get();
        if (!orderSnapshot.empty) {
          const orderDoc = orderSnapshot.docs[0];
          await orderDoc.ref.update({
            status: 'paid',
            paymentId: payment.id,
            updatedAt: new Date()
          });

          // Update user subscription if not already updated
          const orderData = orderDoc.data();
          if (orderData.planId && payment.email) {
            await updateUserSubscription(payment.email, orderData.planId);
          }
        }
      }

      res.json({ status: 'ok' });

    } catch (error) {
      console.error('Webhook error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
});

// Helper function to update user subscription
async function updateUserSubscription(email, planId) {
  try {
    const usersRef = db.collection('meetflow_user_data');
    const userSnapshot = await usersRef
      .where('email', '==', email)
      .limit(1)
      .get();

    if (userSnapshot.empty) {
      throw new Error('User not found');
    }

    const userDoc = userSnapshot.docs[0];
    const userData = userDoc.data();
    const currentDate = new Date();
    
    // Get existing billing data or create new one
    const billingData = userData.billing || {
      currentPlan: 'free',
      status: 'active',
      nextBillingDate: 'NA',
      lastPaymentDate: 'NA',
      lastUpdated: currentDate.toISOString()
    };

    // Update billing information
    const updatedBilling = {
      ...billingData,
      currentPlan: getPlanTitle(planId), // Convert planId to plan title
      status: 'active',
      lastPaymentDate: currentDate.toISOString(),
      nextBillingDate: new Date(currentDate.setMonth(currentDate.getMonth() + 1)).toISOString(),
      lastUpdated: new Date().toISOString()
    };

    // Update user document
    await userDoc.ref.update({
      billing: updatedBilling
    });

    return true;
  } catch (error) {
    console.error('Update subscription error:', error);
    throw error;
  }
}

// Helper function to convert planId to plan title
function getPlanTitle(planId) {
  const planMap = {
    'basic': 'Basic Plan',
    'pro': 'Pro Plan',
    'advanced': 'Advanced Plan'
  };
  return planMap[planId] || 'Free Plan';
}
// payment webhook