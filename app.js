// Includes
const express = require('express');
const { Client } = require('pg');
const path = require('path');
const uuidv4 = require('uuid/v4');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const cookieSession = require('cookie-session');
const bodyParser = require('body-parser');
const testUser ='6f805bae-6988-486c-a4ac-039f7cc98b5b';
const app = express();

const PORT = process.env.PORT || 5000;

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
app.use(cookieSession({
  maxAge: 24 * 60 * 20 * 1000, // 1 day
  keys: [ process.env.COOKIE_KEY ]
}));
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => {
  done(null, user.user_id);
});

passport.deserializeUser((user, done) => {
  const getUser = {
    text: 'SELECT FROM users WHERE user_id = $1',
    values: [ user ]
  };
  client.query(getUser, (err, data) => {
    if (err) {
      return done(err); // Exit error
    }
    done(null, data.rows[0]); // Exit
  });
});

passport.use(new GoogleStrategy(
  {
    clientID: process.env.GOOGLE_CLIENT_ID, 
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/auth/google/callback'
  }, 
  (accessToken, refreshToken, profile, done) => {
    const lookup = {
      text: 'SELECT * FROM users WHERE user_id = $1',
      values: [ profile.id ]
    };
    console.log('IN passport callback: profile.id=', profile.id);
    client.query(lookup, (err, data) => {
      if (err) console.log(err.stack); 
      else {
        const now = new Date();
        if (data.rowCount !== 0) { // User was found
          const updateLastLogin = {
            text: 'UPDATE users SET last_login = $1 WHERE user_id = $2',
            values: [ now, profile.id ]
          };
          client.query(updateLastLogin, (err2, data2) => { // Touch login time
            if (err2) console.log(err2.stack);
            done(null, data.rows[0]); // Exit
          });
        }
        else { // User wasn't found 
          const createUser = {
            text: 'INSERT INTO users (user_id, display_name, email, created_on, last_login) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            values: [ profile.id, profile.displayName, profile.emails[0].value, now, now ]
          };
          client.query(createUser, (err3, data3) => {
            if (err3) {
              done(err3.stack);
            }
            done(null, data3.rows[0]);
          });
        }
      }
    });
  }
));

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

app.get(
  '/auth/google/callback', 
  passport.authenticate('google', 
  { 
    successRedirect: '/',
    failureRedirect: '/login',
    failureFlash: true
  }
));

app.get('/user', (req, res) => {
  console.log(req.session);
  res.send(req.session.passport.user);
});

app.get('/logout', (req, res) => {
  req.logout();
  res.send('Logged out');
});

app.get('/getIssues', (req, res) => {
  const listIssues = {
    text: 'SELECT (tickets.ticket_id, users.display_name, tickets.ticket_subject, tickets.ticket_description, tickets.resolved, tickets.created_on, tickets.resolved_on) FROM tickets, users WHERE tickets.created_by = users.user_id OR tickets.resolved_by = users.user_id;'
  };
  client.query(listIssues, (err, data) => {
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
  });
});

app.get('/create', (req, res) => {
  res.send(path.join(__dirname, 'public', create));
});

app.post('/create', (req, res) => {
  const now = new Date();
  const createTicket = {
    text: 'INSERT INTO tickets(created_by, ticket_subject, ticket_description, created_on) VALUES($1, $2, $3, $4)',
    values: [ req.user, req.body.subject, req.body.description, now]
  };
  client.query(createTicket, (err, data) => {
    if (err) {
      console.log(err.stack);
    }
  })
  res.redirect('/');
});

app.listen(PORT);