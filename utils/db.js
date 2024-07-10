const { MongoClient } = require('mongodb');

class DBClient {
  constructor() {
    this.client = MongoClient;
    this.host = process.env.DB_HOST || 'localhost';
    this.port = process.env.DB_PORT || 27017;
    this.database = process.env.DB_DATABASE || 'files_manager';
    this.connect();
  }

  async connect() {
    const url = 'mongodb+srv://test:test@cluster0.9fen9wg.mongodb.net/';
    try {
      this.client = new MongoClient(url, { useUnifiedTopology: true });
      await this.client.connect();
      this.db = this.client.db(this.database);
      console.log('Connected to the database');
    } catch (error) {
      console.error('Error connecting to the database:', error);
    }
  }

  isAlive() {
    return this.db !== undefined;
  }

  async nbUsers() {
    return this.db.collection('users').countDocuments();
  }

  async nbFiles() {
    return this.db.collection('files').countDocuments();
  }
}
const dbClient = new DBClient();
module.exports = dbClient;
