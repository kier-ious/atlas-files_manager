const express = require('express');
const routes = require('./routes');
const bodyParser = require('body-parser');

const app = express();

const port = process.env.PORT || 5000;

app.use('/', routes);
// app.use(express.json);
app.use(bodyParser.json());

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

module.exports = app;
