const crypto = require('crypto');
const dbClient = require('../utils/db');
const redisClient = require('../utils/redis');

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

  static async getMe(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await dbClient.db.collection('users').findOne({ _id: dbClient.getObjectId(userId) });
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    return res.status(200).json({ id: user._id, email: user.email });
  }
}

module.exports = UsersController;
