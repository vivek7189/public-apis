// tokenService.js
const { google } = require('googleapis');

class TokenService {
  constructor(clientId, clientSecret, db) {
    this.oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      ''
    );
    this.db = db; // Store the passed db instance
  }

  async getValidToken(userData) {
    const fiveMinutes = 5 * 60 * 1000;
    const shouldRefresh = Date.now() + fiveMinutes > userData.tokenExpiryDate;

    if (!shouldRefresh) {
        console.log('old token');
      return {
        accessToken: userData.accessToken,
        isRefreshed: false
      };
    }

    try {
      this.oauth2Client.setCredentials({
        access_token: userData.accessToken,
        refresh_token: userData.refreshToken
      });

      const { credentials } = await this.oauth2Client.refreshAccessToken();
      const newExpiryDate = credentials.expiry_date || Date.now() + (credentials.expires_in * 1000);

      const snapshot = await this.db.collection('meetflow_user_data')
        .where('email', '==', userData.email)
        .get();

      if (!snapshot.empty) {
        console.log('new token updated token');
        const currentTime = Date.now();
        const date = new Date(currentTime);
        
        // Simple date format: MM/DD/YYYY HH:mm
        const lastTokenRefreshDateTime = 
            `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()} ` + 
            `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
        await snapshot.docs[0].ref.update({
          accessToken: credentials.access_token,
          tokenExpiryDate: newExpiryDate,
          lastTokenRefresh: Date.now(),
          lastTokenRefreshDateTime: lastTokenRefreshDateTime
        });
      }

      return {
        accessToken: credentials.access_token,
        isRefreshed: true,
        expiryDate: newExpiryDate
      };
    } catch (error) {
      console.error('Token refresh failed:', error);
      throw error;
    }
  }
}

// Don't create the instance here - export the class instead
module.exports = TokenService;