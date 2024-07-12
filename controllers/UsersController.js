const crypto = require('crypto');
const dbClient = require('../utils/db');

class UsersController {
  static async postNew(req, res) {
    console.log('Request Body:', req.body); // Log the request body to debug

    const { email, password } = req.body;

    try {
      // Check if email or password is missing
      if (!email) {
        return res.status(400).json({ error: 'Missing email' });
      }
      if (!password) {
        return res.status(400).json({ error: 'Missing password' });
      }

      // Connect to the database
      const db = dbClient.getDB(); // Use getDB() to access the MongoDB database instance
      const usersCollection = db.collection('users');

      // Check if user already exists
      const existingUser = await usersCollection.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ error: 'Already exists' });
      }

      // Hash the password using crypto
      const hashedPassword = crypto.createHash('sha1').update(password).digest('hex');

      // Create new user
      const newUser = {
        email,
        password: hashedPassword,
      };

      const result = await usersCollection.insertOne(newUser);

      // Return the new user's email and id
      return res.status(201).json({ email: newUser.email, id: result.insertedId });
    } catch (err) {
      console.error('Error in postNew:', err);
      return res.status(500).json({ error: 'Server error' });
    }
  }
}

module.exports = UsersController;
