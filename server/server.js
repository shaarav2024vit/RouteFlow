const path = require('path');
const { createApp } = require('./app');

const PORT = process.env.PORT || 3000;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'routeflow.sqlite3');

const { app } = createApp(DB_PATH);

app.listen(PORT, () => {
  console.log(`\n🚀 RouteFlow Server running at: http://localhost:${PORT}`);
  console.log(`📁 Persistence database: ${DB_PATH}\n`);
});
