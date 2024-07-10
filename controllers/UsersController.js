import User from '../models/User';
import { generateSHA1Hash } from '../utils/hash';

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
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ error: 'Already exists' });
      }

      // Hash the password
      const hashedPassword = generateSHA1Hash(password);

      // Create new user
      const newUser = new User({
        email,
        password: hashedPassword,
      });

      await newUser.save();

      // Return the new user's email and id
      return res.status(201).json({ email: newUser.email, id: newUser._id });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Server error' });
    }
  }
}

export default UsersController;
