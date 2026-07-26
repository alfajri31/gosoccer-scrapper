const express = require('express');
const cors = require('cors');

const scrapeRoutes = require('./routes/scrape.routes');
const errorHandler = require('./middlewares/error-handler');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/scrape', scrapeRoutes);
app.use(errorHandler);

module.exports = app;

