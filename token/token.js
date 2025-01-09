// tokenService.js
const { google } = require('googleapis');

class TokenService {
  constructor(clientId, clientSecret) {
    this.oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      ''
    );
  }

  async getValidToken(userData) {
    const fiveMinutes = 5 * 60 * 1000;
    const shouldRefresh = Date.now() + fiveMinutes > userData.tokenExpiryDate;

    if (!shouldRefresh) {
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
      const newExpiryDate = Date.now() + (credentials.expires_in * 1000);

      await db.collection('meetflow_user_data')
        .where('email', '==', userData.email)
        .get()
        .then(snapshot => {
          if (!snapshot.empty) {
            snapshot.docs[0].ref.update({
              accessToken: credentials.access_token,
              tokenExpiryDate: newExpiryDate,
              lastTokenRefresh: Date.now()
            });
          }
        });

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

// Create instance with your credentials
const tokenService = new TokenService(
  '1087929121342-jr3oqd7f01s6hoel792lgdvka5prtvdq.apps.googleusercontent.com',
  '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'
);

// Export the instance
module.exports = tokenService;