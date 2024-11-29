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

// Function to get access token
async function getAccessToken() {
    try {
        const response = await axios.post(
            `${API_URL}/token`,
            new URLSearchParams({
                grant_type: 'client_credentials',
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
            }).toString(),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            }
        );

        const { access_token, expires_in } = response.data;
        console.log(`Access token received: ${access_token}`);
        console.log(`Expires in: ${expires_in} seconds`);
        return access_token;
    } catch (error) {
        console.error('Error obtaining access token:', error.response?.data || error.message);
        throw error;
    }
}


// Function to make authenticated API call
async function makeAuthenticatedApiCall(accessToken) {
    try {
        const endpoint = `${API_URL}/v2/astrology/kundli`;
        const params = {
            ayanamsa: 1,
            coordinates: '23.1765,75.7885',
            datetime: '2022-03-17T10:50:40+00:00',
        };

        const response = await axios.get(endpoint, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
            params,
        });

        return response.data;
    } catch (error) {
        console.error('Error making API call:', error.response?.data || error.message);
        throw error;
    }
}


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
app.get('/astrology', async (req, res) => {
    try {
        const accessToken = await getAccessToken();
        console.log('accessToken',accessToken)
        const astrologyData = await makeAuthenticatedApiCall(accessToken);
        console.log('astrologyData',astrologyData)
        res.status(200).json(astrologyData);
    } catch (error) {
        res.status(500).send('Error fetching astrology data',error);
    }
});

app.get('/panchang', async (req, res) => {
    const { ayanamsa = 1, coordinates = '10.214747,78.097626', datetimeVal, la = 'hi' } = req.query;
    const datetime = datetimeVal || new Date().toISOString();

    if (!datetime) {
        return res.status(400).send({
            error: 'Missing required query parameter: datetime is required',
        });
    }

    try {
        const accessToken = await getAccessToken();

        const response = await axios.get(`${API_URL}/v2/astrology/panchang/advanced/`, {
            params: { ayanamsa, coordinates, datetime, la },
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        res.status(200).json(response.data);
    } catch (error) {
        console.error('Error fetching Panchang details:', error.response?.data || error.message);
        res.status(500).send({
            error: 'Failed to fetch Panchang details',
            details: error.response?.data || error.message,
        });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
