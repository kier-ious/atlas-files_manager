const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { MongoClient } = require('mongodb');

const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';

async function uploadFile(fileData, parentId) {
  const client = await MongoClient.connect('mongodb+srv://kier:kier@cluster0.9fen9wg.mongodb.net/');
  const db = client.db(DB);
  const collection = db.collection('files');

  // Validation logic
  if (!fileData.name) {
    return { error: 'Missing name', status: 400 };
  }
  if (!['folder', 'file', 'image'].includes(fileData.type)) {
    return { error: 'Missing type', status: 400 };
  }
  if (fileData.type !== 'folder' && !fileData.data) {
    return { error: 'Missing data', status: 400 };
  }

  if (parentId) {
    const parent = await collection.findOne({ _id: parentId });
    if (!parent) {
      return { error: 'Parent not found', status: 400 };
    }
    if (parent.type !== 'folder') {
      return { error: 'Parent is not a folder', status: 400 };
    }
  }

  // Create folder path if it doesn't exist
  if (!fs.existsSync(FOLDER_PATH)) {
    fs.mkdirSync(FOLDER_PATH, { recursive: true });
  }

  let localPath = null;
  if (fileData.type === 'file' || fileData.type === 'image') {
    const filename = `${uuidv4()}`;
    localPath = path.join(FOLDER_PATH, filename);
    fs.writeFileSync(localPath, Buffer.from(fileData.data, 'base64'));
  }

  const newFile = {
    userId: req.user._id, // Replace with actual user ID from request
    name: fileData.name,
    type: fileData.type,
    isPublic: fileData.isPublic || false,
    parentId: parentId || 0,
    localPath: localPath,
  };

  await collection.insertOne(newFile);
  client.close();
  return newFile;
}

exports.postUpload = async (req, res) => {
  try {
    const fileData = req.body;
    const uploadedFile = await uploadFile(fileData, req.body.parentId);
    if (uploadedFile.error) {
      return res.status(uploadedFile.status).json({ error: uploadedFile.error });
    }
    res.status(201).json(uploadedFile);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
