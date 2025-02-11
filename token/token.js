const { google } = require('googleapis');

class TokenService {
  constructor(clientId, clientSecret, db) {
    if (!clientId || !clientSecret || !db) {
      throw new Error('TokenService requires clientId, clientSecret, and db instance');
    }

    this.oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      ''
    );
    this.db = db;
  }

  async getValidToken(userData) {
    try {
      // Validate input data
      if (!userData) {
        throw new Error('userData is required');
      }

      if (!userData.email) {
        throw new Error('userData.email is required');
      }

      // Check if googleLogin exists
      if (!userData.googleLogin) {
        console.log('No Google login data found for user');
        return {
          accessToken: null,
          isRefreshed: false,
          error: 'No Google login data found'
        };
      }

      // Check for required Google token data
      const googleLogin = userData.googleLogin;
      if (!googleLogin.accessToken || !googleLogin.refreshToken) {
        console.log('Missing required Google token data');
        return {
          accessToken: null,
          isRefreshed: false,
          error: 'Missing required Google token data'
        };
      }

      const fiveMinutes = 5 * 60 * 1000;
      
      // Safely check token expiry
      const tokenExpiryDate = googleLogin.tokenExpiryDate || 0;
      const shouldRefresh = Date.now() + fiveMinutes > tokenExpiryDate;

      if (!shouldRefresh) {
        console.log('Using existing Google token');
        return {
          accessToken: googleLogin.accessToken,
          isRefreshed: false
        };
      }

      try {
        // Set credentials for refresh
        this.oauth2Client.setCredentials({
          access_token: googleLogin.accessToken,
          refresh_token: googleLogin.refreshToken
        });

        // Get new credentials
        const { credentials } = await this.oauth2Client.refreshAccessToken();
        
        if (!credentials || !credentials.access_token) {
          throw new Error('Failed to obtain new credentials');
        }

        const newExpiryDate = credentials.expiry_date || Date.now() + (credentials.expires_in * 1000);

        // Format current time for lastTokenRefreshDateTime
        const currentTime = Date.now();
        const date = new Date(currentTime);
        const lastTokenRefreshDateTime = 
          `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()} ` +
          `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;

        // Find user document
        const snapshot = await this.db.collection('meetflow_user_data')
          .where('email', '==', userData.email)
          .limit(1)
          .get();

        if (snapshot.empty) {
          console.log('User document not found in database');
          return {
            accessToken: credentials.access_token,
            isRefreshed: true,
            error: 'User document not found, but token refreshed'
          };
        }

        // Update the googleLogin object with new token data
        const updateData = {
          'googleLogin.accessToken': credentials.access_token,
          'googleLogin.tokenType': credentials.token_type || 'Bearer',
          'googleLogin.tokenExpiryDate': newExpiryDate,
          'googleLogin.lastTokenRefresh': currentTime,
          'googleLogin.lastTokenRefreshDateTime': lastTokenRefreshDateTime
        };

        try {
          await snapshot.docs[0].ref.update(updateData);
          console.log('Successfully updated Google token data');
        } catch (updateError) {
          console.error('Failed to update database, but token refreshed:', updateError);
          // Still return the new token even if DB update fails
          return {
            accessToken: credentials.access_token,
            isRefreshed: true,
            error: 'Database update failed, but token refreshed'
          };
        }

        return {
          accessToken: credentials.access_token,
          isRefreshed: true,
          expiryDate: newExpiryDate
        };

      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        
        // Check if it's a refresh token error
        if (refreshError.message.includes('invalid_grant')) {
          return {
            accessToken: null,
            isRefreshed: false,
            error: 'Refresh token invalid or expired'
          };
        }

        throw refreshError;
      }

    } catch (error) {
      console.error('TokenService error:', error);
      if (error.response?.data) {
        console.error('Error details:', error.response.data);
      }
      
      return {
        accessToken: null,
        isRefreshed: false,
        error: error.message || 'Token service error'
      };
    }
  }
}

module.exports = TokenService;