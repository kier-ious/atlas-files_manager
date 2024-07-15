const fs = require('fs');
const path = require('path');
const { ObjectId } = require("mongodb");
const { v4: uuidv4 } = require('uuid');
const dbClient = require('../utils/db');
const redisClient = require('../utils/redis');

const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';

class FilesController {
  static async postUpload(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { name, type, parentId, isPublic, data } = req.body;

    // Validate input
    if (!name) {
      return res.status(400).json({ error: 'Missing name' });
    }
    if (!['folder', 'file', 'image'].includes(type)) {
      return res.status(400).json({ error: 'Missing type' });
    }
    if (type !== 'folder' && !data) {
      return res.status(400).json({ error: 'Missing data' });
    }

    const db = dbClient.getDB();
    const filesCollection = db.collection('files');

    if (parentId) {
      console.log(parentId)
      const parent = await filesCollection.findOne({ _id: new ObjectId(parentId) });
      if (!parent) {
        return res.status(400).json({ error: 'Parent not found' });
      }
      if (parent.type !== 'folder') {
        return res.status(400).json({ error: 'Parent is not a folder' });
      }
    }

    // Create folder path if it doesn't exist
    if (!fs.existsSync(FOLDER_PATH)) {
      fs.mkdirSync(FOLDER_PATH, { recursive: true });
    }

    let localPath = null;
    if (type === 'file' || type === 'image') {
      const filename = `${uuidv4()}`;
      localPath = path.join(FOLDER_PATH, filename);
      fs.writeFileSync(localPath, Buffer.from(data, 'base64'));
    }

    const newFile = {
      userId,
      name,
      type,
      isPublic: isPublic || false,
      parentId: parentId || 0,
      localPath: localPath || null,
    };

    const result = await filesCollection.insertOne(newFile);
    return res.status(201).json({
      id: result.insertedId,
      userId,
      name,
      type,
      isPublic: newFile.isPublic,
      parentId: newFile.parentId,
      localPath: newFile.localPath,
    });
  }
}

module.exports = FilesController;
