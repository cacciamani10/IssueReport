// Includes
const express = require('express');
const { Client } = require('pg');

const app = express();

const PORT = process.env.PORT || 5000;
const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: true
});

client.connect();

client.query('SELECT table_schema,table_name FROM information_schema.tables;', (err, res) => {
    if (err) throw err;
    for (let row of res.rows) {
      console.log(JSON.stringify(row));
    }
    client.end();
  });


//app.use(express.static('public'));
app.get('/', (req, res) => {
    res.send('<h1>Hello</h1>');
});

app.listen(PORT);