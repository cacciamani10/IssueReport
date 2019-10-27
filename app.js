// Includes
const express = require('express');
const { Client } = require('pg');
const path = require('path');
const uuidv4 = require('uuid/v4');
const testUser ='6f805bae-6988-486c-a4ac-039f7cc98b5b';
const app = express();

const PORT = process.env.PORT || 5000;
const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: true
});

client.connect();


app.use(express.static('public'));
app.get('/', (req, res) => {
    res.send(path.join(__dirname, 'public', index));
});


app.get('/getIssues', (req, res) => {
  const string = 'SELECT * FROM tickets';
  client.query(string, (err, data) => {
    if (err)
      res.writeHead(500);
    else {
      let jsonRows = '';
      for (let row of res.rows) {
        jsonRows += JSON.stringify(row);
      }
      res.send(jsonRows);
    }
  })
});

app.post('/create', (req, res) => {
  console.log(req);
  const string = 'INSERT INTO tickets(ticket_id, created_by, ticket_subject, ticket_description, resolved) VALUES($1, $2, $3, $4, $5) RETURNING *';
  const values = [ uuidv4(), testUser, req.subject, req,description, false];
  if (err) {
    console.log(err.stack);
  }
  else {
    console.log('Added', res.rows[0]);
  }
});

app.listen(PORT);