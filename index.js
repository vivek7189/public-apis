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
const axios = require('axios');
const app = express();
const emailService = require('./email-service/email');
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
      // In production, use bcrypt.compare
      if (userData.customLogin?.password !== password) {
        return res.status(401).json({
          success: false,
          error: 'Invalid password'
        });
      }
    }

    // Generate new token set after successful authentication
    const tokenManager = new TokenManager(db);
    const tokenData = await tokenManager.generateTokenSet();

    // Create customLogin object with user data except email and phone
    const customLogin = {
      name: userData.customLogin?.name,
      picture: userData.customLogin?.picture,
      calanderConnected: userData.customLogin?.calanderConnected,
      accessToken: tokenData.accessToken,
      tokenType: tokenData.tokenType,
      tokenExpiryDate: tokenData.tokenExpiryDate,
      lastLoginAt: new Date().toISOString(),
      // Token management fields inside customLogin
      refreshToken: tokenData.refreshToken,
      refreshTokenCreatedAt: tokenData.refreshTokenCreatedAt,
      refreshTokenExpiryDate: tokenData.refreshTokenExpiryDate,
      lastTokenRefresh: tokenData.lastTokenRefresh
    };

    // Update user with new structure
    await userDoc.ref.update({
      email: userData.email,
      customLogin
    });

    // Prepare response data
    const responseData = {
      userId: userDoc.id,
      email: userData.email,
      phoneNumber: userData.phoneNumber,
      customLogin
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
      phone
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
      if (lastTokenRefreshDateTime) newUserData.lastTokenRefreshDateTime = lastTokenRefreshDateTime;

      await usersRef.add(newUserData);

      
       emailService.sendEmail({
        to: email,
        subject: 'Test hello',
        text: 'Text Email',
        html: '<h1>Demo from MeetSynk</h1>'
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
      if (lastTokenRefreshDateTime) updateData.lastTokenRefreshDateTime = lastTokenRefreshDateTime;
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



app.post('/schedule-meeting', async (req, res) => {
  try {
    const {
      selectedDate="2025-01-23",
      selectedTime="3:45 PM",
      name="dada",
      email="vivekkumar7189@gmail.com",
      notes="ada",
      timeZone="Asia/Calcutta",
      currentEmail="malik.vk07@gmail.com",
      phoneNumber = "+917042330092"
    } = req.body;
    const userSnapshot = await db.collection('meetflow_user_data')
    .where('email', '==', currentEmail)
    .limit(1)
    .get();

  if (userSnapshot.empty) {
    throw new Error('User not found');
  }

  const userData = userSnapshot.docs[0].data();

  // Log the raw input
  console.log('Raw input:', {
    selectedDate,
    selectedTime,
    timeZone,
    serverTime: new Date().toISOString()
  });

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

  console.log('Parsed times:', {
    originalInput: `${selectedDate} ${selectedTime}`,
    parsedStartTime: meetingDateTime.format(),
    parsedEndTime: meetingEndTime.format(),
    timeZone: timeZone
  });

  // Create event details using the timezone-aware times
  const eventDetails = {
    summary: `Meeting with ${name}`,
    description: notes || 'No additional notes',
    start: {
      dateTime: meetingDateTime.format(),  // ISO format with timezone
      timeZone: timeZone
    },
    end: {
      dateTime: meetingEndTime.format(),   // ISO format with timezone
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

  //console.log('Event details:', JSON.stringify(eventDetails, null, 2));

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
    //console.error('Calendar API error:', errorData);
    throw new Error(errorData.error?.message || 'Failed to create calendar event');
  }

  const eventData = await calendarResponse.json();

   // Create gmail email content
    const emailContent = `Content-Type: text/html; charset=utf-8
MIME-Version: 1.0
From: ${currentEmail}
To: ${email}
Subject: Meeting Confirmation: Meeting with ${name}

<html>
  <body>
    <h2>Meeting Confirmation</h2>
    <p>Hello ${name},</p>
    <p>Your meeting has been scheduled successfully.</p>
    <p><strong>Date:</strong> ${meetingDateTime.format('LL')}</p>
    <p><strong>Time:</strong> ${meetingDateTime.format('LT')} ${timeZone}</p>
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
    const emailData={
      email,name,meetingDateTime,timeZone,notes,hangoutLink
    }
    // send email from our domain
    emailService.sendMeetingInviteEmail(emailData)
    //end email from meetsynk

    /// email gmail send END
    // if (phoneNumber) {
    //   const meetingDetails = {
    //     name,
    //     phoneNumber,
    //     meetingDateTime: meetingDateTime.toDate(),
    //     meetingLink: eventData.hangoutLink || '--',
    //     timeZone
    //   };
    //   await sendWhatsAppMessage(phoneNumber)
    //   //scheduleWhatsAppReminder(meetingDetails);
    // }
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
          'Authorization': 'Bearer EAARpOxShMs4BO9bxJ3iD8ZCn5b6uvfKSud3icnM0hZCYDZCU8S0JLN75ZAbKrynOhAwZCSvvZAsAQtnyjBvPARpyFd515qZAK8vjnHvMc2WYCnp0CQKbWH1iDEe4GQG1yf5RNFqpTXPovCOE6mPmxaajZBstilZAPW3fttetJ7hGJTCWB2ZBOLqEYZCZAc6L8hynkxDpt2pc5twJvH0oTQ9h7byZA3UP0KuYZD',
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
    const zoomData={
      zoomLink:integrationData?.personalMeetingUrl,
      zoomConnected:true
    }
    // Save to Firestore
    await db.collection('meetflow_zoom_integrations').doc(zoomUserData.email).set(
      integrationData,
      { merge: true } // Use merge to allow updating existing documents
    );
    await db.collection('meetflow_user_data').doc(email).set(
       zoomData,
      { merge: true } // Use merge to allow updating existing documents
    );

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

// 3. Disconnect Zoom Account
// app.post('/meetflow/zoom/disconnect', async (req, res) => {
//   try {
//     const { email } = req.body;

//     if (!email) {
//       return res.status(400).json({ error: 'Email is required' });
//     }

//     const integrationDoc = await db.collection('meetflow_zoom_integrations')
//       .doc(email)
//       .get();

//     if (integrationDoc.exists) {
//       const integrationData = integrationDoc.data();

//       // Revoke token with Zoom
//       await fetch('https://zoom.us/oauth/revoke', {
//         method: 'POST',
//         headers: {
//           'Authorization': `Basic ${Buffer.from(
//             `${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`
//           ).toString('base64')}`,
//           'Content-Type': 'application/json'
//         },
//         body: JSON.stringify({
//           token: integrationData.accessToken
//         })
//       });

//       // Delete from Firestore
//       await db.collection('meetflow_zoom_integrations').doc(email).delete();
//     }

//     res.json({ success: true });

//   } catch (error) {
//     console.error('Disconnect error:', error);
//     res.status(500).json({ error: 'Failed to disconnect Zoom account' });
//   }
// });

// 4. Create Meeting
// app.post('/meetflow/zoom/meetings', async (req, res) => {
//   try {
//     const { email, topic, duration, startTime, agenda } = req.body;

//     if (!email || !topic || !startTime) {
//       return res.status(400).json({ error: 'Missing required parameters' });
//     }

//     const integrationDoc = await db.collection('meetflow_zoom_integrations')
//       .doc(email)
//       .get();

//     if (!integrationDoc.exists) {
//       return res.status(400).json({ error: 'Zoom account not connected' });
//     }

//     const integrationData = integrationDoc.data();

//     // Create Zoom meeting
//     const response = await fetch('https://api.zoom.us/v2/users/me/meetings', {
//       method: 'POST',
//       headers: {
//         'Authorization': `Bearer ${integrationData.accessToken}`,
//         'Content-Type': 'application/json'
//       },
//       body: JSON.stringify({
//         topic,
//         duration,
//         start_time: startTime,
//         agenda,
//         type: 2, // Scheduled meeting
//         settings: {
//           host_video: true,
//           participant_video: true,
//           join_before_host: true
//         }
//       })
//     });

//     const meeting = await response.json();

//     // Save meeting to Firestore
//     await db.collection('meetflow_zoom_meetings').add({
//       email,
//       meetingId: meeting.id,
//       topic: meeting.topic,
//       startTime: new Date(meeting.start_time),
//       duration: meeting.duration,
//       joinUrl: meeting.join_url,
//       status: 'scheduled',
//       createdAt: new Date()
//     });

//     res.json({
//       success: true,
//       meeting: {
//         id: meeting.id,
//         joinUrl: meeting.join_url,
//         startTime: meeting.start_time,
//         topic: meeting.topic
//       }
//     });

//   } catch (error) {
//     console.error('Meeting creation error:', error);
//     res.status(500).json({ error: 'Failed to create meeting' });
//   }
// });