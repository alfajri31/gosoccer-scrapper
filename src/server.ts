import 'dotenv/config';

import app from './app';

import {connectDatabase} from './db/db';

const port = Number(process.env.PORT) || 3000;

app.listen(port, () => {
  connectDatabase();
  console.log(`Server running at http://localhost:${port}`);
});
