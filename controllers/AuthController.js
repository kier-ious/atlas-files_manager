const redisClient = require('../utils/redis');
const dbClient = require('../utils/db');
const { v4: uuidv4 } = require('uuid');
const sha1 = require('sha1');
const { Buffer } = require('buffer');

// const User = {

//   data: [
//     { email: 'user1@example.com', password: 'hashedPassword1', _id: '1' },
//     { email: 'user2@example.com', password: 'hashedPassword2', _id: '2' },
//   ],

//   findOne(email) {
//     return this.data.find(user => user.email === email);
//   },

//   findById(id) {
//     return this.data.find(user => user._id === id);
//   },
// };

class AuthController {
  static async getConnect(req, res) {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Basic ')) {
          return res.status(401).json({ error: 'Unauthorized' });
      }

      const base64Credentials = authHeader.split(' ')[1];
      const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
      const [email, password] = credentials.split(':');

      if (!email || !password) {
          return res.status(401).json({ error: 'Unauthorized' });
      }

      const hashedPassword = sha1(password);
      const user = await dbClient.db.collection('users').findOne({ email, password: hashedPassword });

      if (!user) {
          return res.status(401).json({ error: 'Unauthorized' });
      }

      const token = uuidv4();
      await redisClient.set(`auth_${token}`, user._id.toString(), 24 * 60 * 60);

      return res.status(200).json({ token });
  }

  static async getDisconnect(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    await redisClient.del(`auth_${token}`);
    return res.status(204).send();
  }
}

module.exports = AuthController;
