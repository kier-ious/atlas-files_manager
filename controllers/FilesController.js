const fs = require('fs');
const path = require('path');
const mime = require('mime-types');
const { ObjectId } = require('mongodb');
const { v4: uuidv4 } = require('uuid');
const dbClient = require('../utils/db');
const redisClient = require('../utils/redis');
const Bull = require('bull');

const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';
const fileQueue = new Bull('fileQueue');

class FilesController {
  static async authorize(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      res.status(401).json({ error: 'Unauthorized' });
      return null;
    }

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return null;
    }

    return userId;
  }

  static async postUpload(req, res) {
    try {
      const userId = await FilesController.authorize(req, res);
      if (!userId) return;

      const { name, type, parentId, isPublic, data } = req.body;

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
        const parent = await filesCollection.findOne({ _id: new ObjectId(parentId) });
        if (!parent) {
          return res.status(400).json({ error: 'Parent not found' });
        }
        if (parent.type !== 'folder') {
          return res.status(400).json({ error: 'Parent is not a folder' });
        }
      }

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

      if (type === 'image') {
        await fileQueue.add({ userId, fileId: result.insertedId.toString() });
      }

      return res.status(201).json({
        id: result.insertedId,
        userId,
        name,
        type,
        isPublic: newFile.isPublic,
        parentId: newFile.parentId,
        localPath: newFile.localPath,
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  static async getFileById(req, res) {
    try {
      const userId = await FilesController.authorize(req, res);
      if (!userId) return;

      const fileId = req.params.id;
      const db = dbClient.getDB();
      const filesCollection = db.collection('files');

      const file = await filesCollection.findOne({ _id: new ObjectId(fileId), userId });
      if (!file) {
        return res.status(404).json({ error: 'Not found' });
      }

      return res.status(200).json(file);
    } catch (error) {
      console.error('Error fetching file by ID:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  static async getFiles(req, res) {
    try {
      const userId = await FilesController.authorize(req, res);
      if (!userId) return;

      const { parentId = 0, page = 0 } = req.query;
      const pageSize = 20;
      const skip = page * pageSize;

      const db = dbClient.getDB();
      const filesCollection = db.collection('files');

      const files = await filesCollection.find({ userId, parentId })
                                         .skip(skip)
                                         .limit(pageSize)
                                         .toArray();
      return res.status(200).json(files);
    } catch (error) {
      console.error('Error fetching files:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  static async putPublish(req, res) {
    try {
      const userId = await FilesController.authorize(req, res);
      if (!userId) return;

      const fileId = req.params.id;
      const db = dbClient.getDB();
      const filesCollection = db.collection('files');

      const file = await filesCollection.findOne({ _id: new ObjectId(fileId), userId });
      if (!file) {
        return res.status(404).json({ error: 'Not found' });
      }

      const updatedFile = await filesCollection.findOneAndUpdate(
        { _id: new ObjectId(fileId), userId },
        { $set: { isPublic: true } },
        { returnOriginal: false }
      );

      return res.status(200).json(updatedFile.value);
    } catch (error) {
      console.error('Error publishing file:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  static async putUnpublish(req, res) {
    try {
      const userId = await FilesController.authorize(req, res);
      if (!userId) return;

      const fileId = req.params.id;
      const db = dbClient.getDB();
      const filesCollection = db.collection('files');

      const file = await filesCollection.findOne({ _id: new ObjectId(fileId), userId });
      if (!file) {
        return res.status(404).json({ error: 'Not found' });
      }

      const updatedFile = await filesCollection.findOneAndUpdate(
        { _id: new ObjectId(fileId), userId },
        { $set: { isPublic: false } },
        { returnOriginal: false }
      );

      return res.status(200).json(updatedFile.value);
    } catch (error) {
      console.error('Error unpublishing file:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  static async getFileData(req, res) {
    try {
      const token = req.headers['x-token'];
      const fileId = req.params.id;
      const size = req.query.size;

      const db = dbClient.getDB();
      const filesCollection = db.collection('files');

      const file = await filesCollection.findOne({ _id: new ObjectId(fileId) });
      if (!file) {
        return res.status(404).json({ error: 'Not found' });
      }

      const userId = token ? await redisClient.get(`auth_${token}`) : null;

      if (!file.isPublic && (!token || file.userId !== userId)) {
        return res.status(404).json({ error: 'Not found' });
      }

      if (file.type === 'folder') {
        return res.status(400).json({ error: 'A folder doesn\'t have content' });
      }

      let localPath = file.localPath;
      if (size) {
        const sizeSuffix = `_${size}`;
        const sizedPath = `${file.localPath}${sizeSuffix}`;
        if (fs.existsSync(sizedPath)) {
          localPath = sizedPath;
        } else {
          return res.status(404).json({ error: 'Not found' });
        }
      }

      if (!fs.existsSync(localPath)) {
        return res.status(404).json({ error: 'Not found' });
      }

      const mimeType = mime.lookup(file.name);
      const fileContent = fs.readFileSync(localPath);

      res.setHeader('Content-Type', mimeType);
      res.send(fileContent);
    } catch (error) {
      console.error('Error fetching file data:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  static async getFileFromDB(fileId) {
    const db = dbClient.getDB();
    const filesCollection = db.collection('files');
    return filesCollection.findOne({ _id: new ObjectId(fileId) });
  }

  static isFileAccessible(file, userId, token) {
    return file.isPublic || (token && file.userId === userId);
  }
}

module.exports = FilesController;
