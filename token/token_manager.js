const crypto = require('crypto');

class TokenManager {
  constructor(db) {
    if (!db) {
      throw new Error('Database reference is required');
    }
    this.db = db; // Store database reference
    this.ACCESS_TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    this.REFRESH_TOKEN_EXPIRY = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
  }

  // Generate a unique access token with database check
  async generateAccessToken() {
    let token;
    let isUnique = false;
    
    while (!isUnique) {
      token = crypto.randomBytes(32).toString('hex');
      
      // Check if token exists in database using the injected db reference
      const tokenCheck = await this.db.collection('meetflow_user_data')
        .where('accessToken', '==', token)
        .limit(1)
        .get();
      
      isUnique = tokenCheck.empty;
    }

    return {
      token,
      createdAt: new Date().toISOString(),
      expiryDate: new Date(Date.now() + this.ACCESS_TOKEN_EXPIRY).toISOString()
    };
  }

  // Generate a unique refresh token with database check
  async generateRefreshToken() {
    let token;
    let isUnique = false;
    
    while (!isUnique) {
      token = crypto.randomBytes(40).toString('hex');
      
      // Check if token exists in database using the injected db reference
      const tokenCheck = await this.db.collection('meetflow_user_data')
        .where('refreshToken', '==', token)
        .limit(1)
        .get();
      
      isUnique = tokenCheck.empty;
    }

    return {
      token,
      createdAt: new Date().toISOString(),
      expiryDate: new Date(Date.now() + this.REFRESH_TOKEN_EXPIRY).toISOString()
    };
  }

  // Generate complete token set
  async generateTokenSet() {
    const accessTokenData = await this.generateAccessToken();
    const refreshTokenData = await this.generateRefreshToken();

    return {
      accessToken: accessTokenData.token,
      refreshToken: refreshTokenData.token,
      tokenCreatedAt: accessTokenData.createdAt,
      tokenExpiryDate: accessTokenData.expiryDate,
      refreshTokenCreatedAt: refreshTokenData.createdAt,
      refreshTokenExpiryDate: refreshTokenData.expiryDate,
      tokenType: 'Custom',
      lastTokenRefresh: new Date().toISOString()
    };
  }

  // Verify if access token is expired
  isAccessTokenExpired(tokenExpiryDate) {
    return new Date(tokenExpiryDate) < new Date();
  }

  // Refresh access token using refresh token
  async refreshAccessToken(refreshToken, oldTokenExpiryDate) {
    // Verify refresh token is valid and not expired
    if (this.isAccessTokenExpired(oldTokenExpiryDate)) {
      const newAccessToken = await this.generateAccessToken();
      
      return {
        accessToken: newAccessToken.token,
        tokenCreatedAt: newAccessToken.createdAt,
        tokenExpiryDate: newAccessToken.expiryDate,
        lastTokenRefresh: new Date().toISOString()
      };
    }
    
    throw new Error('Invalid or expired refresh token');
  }
}

module.exports = TokenManager;