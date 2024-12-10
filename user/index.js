const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const db = getFirestore();

module.exports = function(app) {
  // Collection reference
  const usersRef = db.collection('users');

  // Login or Register user
  app.post('/api/users/login', async (req, res) => {
    try {
      const { phoneNumber } = req.body;

      if (!phoneNumber) {
        return res.status(400).json({ 
          error: 'Phone number is required' 
        });
      }

      // Validate phone number format (must include country code)
      if (!phoneNumber.startsWith('+')) {
        return res.status(400).json({
          error: 'Phone number must include country code (e.g., +91)'
        });
      }

      // Check if user exists with exact phone number
      const userSnapshot = await usersRef
        .where('phoneNumber', '==', phoneNumber)
        .get();

      if (userSnapshot.empty) {
        // User doesn't exist, create new user
        const newUser = {
          phoneNumber,  // Store exactly as received
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          status: 'active',
          lastLogin: FieldValue.serverTimestamp()
        };

        const docRef = await usersRef.add(newUser);
        return res.status(201).json({
          id: docRef.id,
          ...newUser,
          isNewUser: true
        });
      }

      // User exists, update last login
      const userDoc = userSnapshot.docs[0];
      await userDoc.ref.update({
        lastLogin: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });

      return res.status(200).json({
        id: userDoc.id,
        ...userDoc.data(),
        isNewUser: false
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get user profile
  app.get('/api/users/:userId', async (req, res) => {
    try {
      const userDoc = await usersRef.doc(req.params.userId).get();

      if (!userDoc.exists) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.status(200).json({
        id: userDoc.id,
        ...userDoc.data()
      });

    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Update user profile
  app.patch('/api/users/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const updateData = req.body;

      // Remove protected fields
      delete updateData.phoneNumber;  // Don't allow phone number updates
      delete updateData.createdAt;    // Don't allow creation date updates

      // Add update timestamp
      updateData.updatedAt = FieldValue.serverTimestamp();

      await usersRef.doc(userId).update(updateData);

      // Fetch and return updated user data
      const updatedDoc = await usersRef.doc(userId).get();
      
      res.status(200).json({
        id: updatedDoc.id,
        ...updatedDoc.data()
      });

    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Search users by exact phone number
  app.get('/api/users', async (req, res) => {
    try {
      const { phone, limit = 10 } = req.query;
      let query = usersRef;

      if (phone) {
        // Search with exact phone number
        query = query.where('phoneNumber', '==', phone);
      }

      const snapshot = await query.limit(parseInt(limit)).get();
      
      const users = [];
      snapshot.forEach(doc => {
        users.push({
          id: doc.id,
          ...doc.data()
        });
      });

      res.status(200).json(users);

    } catch (error) {
      console.error('Error searching users:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
};