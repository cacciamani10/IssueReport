// Includes
const express = require('express');
const { Client } = require('pg');
const path = require('path');
const uuidv4 = require('uuid/v4');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const bodyParser = require('body-parser');
const testUser ='6f805bae-6988-486c-a4ac-039f7cc98b5b';
const app = express();

const PORT = process.env.PORT || 5000;

passport.use(new GoogleStrategy(
  {
    clientID: process.env.GOOGLE_CLIENT_ID, // googleCLientID
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/auth/google/callback'
  }, 
  (accessToken, refreshToken, profile, done) => {
    const string = 'SELECT * FROM users WHERE user_id = $1;';
    const values = [ profile.id ];
    console.log('profile.id', profile.id);
    client.query(string, values, (err, data) => {
      if (err) {
        console.log(err.stack);
      }
      else {
        console.log(data);
      }
    });
  }
));

// Init DB
const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: true
});
client.connect();

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static('public'));

// Routes
app.get('/', (req, res) => {
  res.send(path.join(__dirname, 'public', index));
});

app.get(
  '/auth/google', 
  passport.authenticate('google', {
    scope: ['profile', 'email']
  })
);

app.get('/auth/google/callback', passport.authenticate('google'));

app.get('/getIssues', (req, res) => {
  const string = 'SELECT * FROM tickets;';
  client.query(string, (err, data) => {
    if (err)
      res.writeHead(500);
    else {
      let jsonRows = [];
      for (let row of data.rows) {
        jsonRows.push(row);
      }
      jsonRows = JSON.stringify(jsonRows);
      res.send(jsonRows);
    }
  })
});

app.get('/create', (req, res) => {
  res.send(path.join(__dirname, 'public', create));
});

app.post('/create', (req, res) => {
  const string = 'INSERT INTO tickets(ticket_id, created_by, ticket_subject, ticket_description, resolved, created_on) VALUES($1, $2, $3, $4, $5, NOW()) RETURNING *;';
  const values = [ uuidv4(), testUser, req.body.subject, req.body.description, false];
  client.query(string, values, (err, data) => {
    if (err) {
      console.log(err.stack);
    }
  })
  res.redirect('/');
});

app.listen(PORT);