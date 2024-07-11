const crypto = require('crypto');

const dbClient = require('../utils/db');

class UsersController {
  static async postNew(req, res) {
    const { email, password } = req.body;

    try {
      // Check if email or password is missing
      if (!email) {
        return res.status(400).json({ error: 'Missing email' });
      }
      if (!password) {
        return res.status(400).json({ error: 'Missing password' });
      }

      // Check if user already exists
      const existingUser = await dbClient.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ error: 'Already exists' });
      }

      // Hash the password using crypto
      const hashedPassword = crypto.createHash('sha1').update(password).digest('hex');

      // Create new user
      const newUser = dbClient.createUser({ email, password: hashedPassword });

      await newUser.save();

      // Return the new user's email and id
      return res.status(201).json({ email: newUser.email, id: newUser._id });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Server error' });
    }
  }
}

module.exports = UsersController;
