const Bull = require('bull');
const imageThumbnail = require('image-thumbnail');
const fs = require('fs');
const path = require('path');
const dbClient = require('../utils/db');

const fileQueue = new Bull('fileQueue');

fileQueue.process(async (job) => {
  const { userId, fileId } = job.data;

  if (!fileId) {
    throw new Error('Missing fileId');
  }

  if (!userId) {
    throw new Error('Missing userId');
  }

  const db = dbClient.getDB();
  const filesCollection = db.collection('files');

  const file = await filesCollection.findOne({ _id: new ObjectId(fileId), userId });
  if (!file) {
    throw new Error('File not found');
  }

  const sizes = [500, 250, 100];
  for (const size of sizes) {
    const options = { width: size };
    const thumbnail = await imageThumbnail(file.localPath, options);
    const thumbnailPath = `${file.localPath}_${size}`;
    fs.writeFileSync(thumbnailPath, thumbnail);
  }
});

module.exports = fileQueue;
