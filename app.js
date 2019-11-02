// Includes
const express = require('express');
const { Client } = require('pg');
const path = require('path');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const LocalStrategy = require('passport-local').Strategy;
const uuidv4 = require('uuid/v4');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const cookieSession = require('cookie-session');
const bodyParser = require('body-parser');
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

app.use(cookieSession({
  maxAge: 24 * 60 * 20 * 1000, // 1 day
  keys: [ process.env.COOKIE_KEY ]
}));
app.use(passport.initialize());
app.use(passport.session());

const redirectIfLoggedOut = (req, res, next) => {
  if (req.user == null) {
    console.log('no user');
    res.redirect('/login');
  } else {
    next();
  }
};

const queryToArray = (queryRow) => {
  return queryRow.replace(/"|\)|\(/g, '').split(',');
}

passport.serializeUser((user, done) => {
  done(null, user.user_id);
});

passport.deserializeUser((user, done) => {
  const getUser = {
    text: 'SELECT (user_id, display_name) FROM users WHERE user_id = $1',
    values: [ user ]
  };
  client.query(getUser, (err, data) => {
    if (data.rowCount !== 0) {
      const dataParse = queryToArray(data.rows[0].row);
      const User = {
        user_id: dataParse[0],
        display_name: dataParse[1]
      };
      return done(null, User);
    }
    return done(err, data);
  });
});

passport.use(new LocalStrategy (
(username, password, done) => {
  console.log('Attempting to login', username,  'locally');
  const lookup = {
    text: 'SELECT *  FROM users WHERE display_name = $1 OR email = $1',
    //SELECT (password, user_id, display_name)  FROM users WHERE display_name = $1 OR email = $1
    values: [ username ]
  };
  client.query(lookup, (err, data) => {
    if (err) return done(err.stack); 
    else {
      const now = new Date();
      if (data.rowCount !== 0) { // User was found
        const user = data.rows[0];
        console.log('Query returned a user', user);
        bcrypt.compare(password, user.password, (bcrErr, result) => {
          if (bcrErr) return done(err);
          if (result) {
            return done(null, user);
          }
          else {
            return done(null, false);
          }
        });
      }
      else {  // user wasn't found
        return done(null, false);
      }
    }
  });
}));

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

// Static Routes
app.get('/', redirectIfLoggedOut, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
})

app.get('/create', redirectIfLoggedOut, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'create.html'));
});


// Google Auth
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

app.get('/user', redirectIfLoggedOut, (req, res) => {
  res.json(req.user);
});

app.get('/logout', (req, res) => {
  req.session = null;
  req.user = null;
  res.redirect('/'); 
});

app.get('/getIssues', redirectIfLoggedOut, (req, res) => {
  const listIssues = {
    text: 'SELECT (tickets.ticket_id, users.display_name, tickets.ticket_subject, tickets.ticket_description, tickets.resolved, tickets.resolved_on, tickets.created_on) FROM tickets, users WHERE tickets.created_by = users.user_id OR tickets.resolved_by = users.user_id;'
  };
  client.query(listIssues, (err, data) => {
    if (err)
      res.writeHead(500);
    else {
      let jsonRows = [];
      for (let row of data.rows) {
        row = queryToArray(row.row);
        const Issue = {
          ticket_id: row[0],
          created_by: row[1],
          ticket_subject: row[2],
          ticket_description: row[3],
          resolved: ((row[4] === 't') ? true : false),
          resolved_on: row[5],
          created_on: row[6]
        };
        jsonRows.push(Issue);
      }
      jsonRows = JSON.stringify(jsonRows);
      res.send(jsonRows);
    }
  });
});

app.post('/register', (req, res) => {
  const now = new Date();
  console.log('recieved req..', req.body.email);
  bcrypt.hash(req.body.password, saltRounds, (err, hash) => {
    console.log(uuidv4(), req.body.display_name, req.body.email, hash, now, now);
    const createUser = {
      text: 'INSERT INTO users (user_id, display_name, email, password, created_on, last_login) VALUES($1, $2, $3, $4, $5, $6)',
      values: [ uuidv4(), req.body.display_name, req.body.email, hash, now, now ]
    };
    client.query(createUser, (queryErr, data) => {
      if (err) {
        console.log(err.stack);
      }
      res.redirect('/');
    });
  });
});

app.post(
  '/login',  
  passport.authenticate('local',
  {
    successRedirect: '/',
    failureRedirect: '/login',
    failureFlash: 'Invalid username, email, or password'
  }),
  );

app.post('/create', redirectIfLoggedOut, (req, res) => {
  const now = new Date();
  const createTicket = {
    text: 'INSERT INTO tickets(created_by, ticket_subject, ticket_description, created_on) VALUES($1, $2, $3, $4)',
    values: [ req.user.user_id, req.body.subject, req.body.description, now]
  };
  client.query(createTicket, (err, data) => {
    if (err) {
      console.log(err.stack);
    }
  });
  res.redirect('/');
});

app.use(express.static('public', { extensions: ['html']} ));

app.listen(PORT);