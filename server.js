const bodyParser = require('body-parser');
const express = require('express');
const routes = require('./routes');
const dbClient = require('./utils/db'); // Adjust the path to your db.js

const app = express();
const port = process.env.PORT || 5001;

// Middleware to parse JSON bodies
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/', routes);

// Ensure the database connection is established before starting the server
dbClient.connect().then(() => {
  if (dbClient.isAlive()) {
    console.log('Database is connected and alive');

    // Start the Express server only after the database connection is established
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  } else {
    console.error('Failed to connect to the database');
  }
}).catch(err => {
  console.error('Error during database connection:', err);
});

module.exports = app;
