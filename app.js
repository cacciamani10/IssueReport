// Includes
const express = require('express');
const secure = require('express-force-https');
const { Client } = require('pg');
const path = require('path');
const favicon = require('serve-favicon');
const passport = require('passport');
const nodeMailer = require('nodemailer');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const LocalStrategy = require('passport-local').Strategy;
const uuidv4 = require('uuid/v4');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const cookieSession = require('cookie-session');
const bodyParser = require('body-parser');
const { check, validationResult } = require('express-validator');
const app = express();

const PORT = process.env.PORT || 5000;

const transporter = nodeMailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: 'issuetracker.donotreply@gmail.com',
    pass: process.env.GMAIL_PASSWORD
  }
});
transporter.verify((err, success) => {
  if (err) { console.log('Transporter Error', err); }
  else { console.log('Successful connection', success); }
});

// Init DB
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: true
});
client.connect();

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(favicon(path.join(__dirname, 'public', 'img', 'favicon.ico')));
app.use(cookieSession({
  maxAge: 24 * 60 * 20 * 1000, // 1 day
  keys: [ process.env.COOKIE_KEY ]
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(secure);
const redirectIfLoggedOut = (req, res, next) => {
  if (req.user == null) { res.redirect('/login'); } 
  else { next(); }
};

passport.serializeUser((user, done) => {
  done(null, user.user_id);
});

passport.deserializeUser((user, done) => {
  const getUser = {
    text: 'SELECT json_agg(users) FROM users WHERE user_id = $1',
    values: [ user ]
  };
  client.query(getUser, (err, data) => {
    if (data.rowCount !== 0) {
      const User = data.rows[0].json_agg[0];
      return done(null, { user_id: User.user_id, display_name: User.display_name });
    }
    return done(err, data);
  });
});

passport.use(
  'local', new LocalStrategy (
  (username, password, done) => {
  const lookup = {
    text: 'SELECT json_agg(users) FROM users WHERE display_name = $1 OR email = $1',
    values: [ username ]
  };
  client.query(lookup, (err, data) => {
    if (err) { return done(err.stack); }
    else {
      const now = new Date();
      if (data.rows[0].json_agg != null) { // User was found
        const user = data.rows[0].json_agg[0];
        bcrypt.compare(password, user.password, (bcrErr, result) => {
          if (bcrErr) { return done(err); }
          if (result) { return done(null, user); }
          else { return done(null, false); }
        });
      } // user wasn't found
      else { return done(null, false); } 
    }
  });})
);

passport.use(new GoogleStrategy(
  {
    clientID: process.env.GOOGLE_CLIENT_ID, 
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/auth/google/callback'
  }, 
  (accessToken, refreshToken, profile, done) => {
    const lookup = {
      text: 'SELECT json_agg(users) FROM users WHERE user_id = $1',
      values: [ profile.id ]
    };
    client.query(lookup, (err, data) => {
      if (err) { console.log(err.stack); }
      else {
        const now = new Date();
        if (data.rows[0].json_agg != null) { // User was found
          const updateLastLogin = {
            text: 'UPDATE users SET last_login = $1 WHERE user_id = $2',
            values: [ now, profile.id ]
          };
          client.query(updateLastLogin, (err2, data2) => { // Touch login time
            if (err2) { console.log(err2.stack); }
            done(null, data.rows[0].json_agg[0]); // Exit
          });
        }
        else { // User wasn't found 
          const createUser = {
            text: 'INSERT INTO users (user_id, display_name, email, created_on, last_login) VALUES ($1, $2, $3, $4, $5) RETURNING row_to_json(users.*)',
            values: [ profile.id, profile.displayName, profile.emails[0].value, now, now ]
          };
          client.query(createUser, (err3, data3) => {
            if (err3) { done(err3.stack); }
            done(null, data3.rows[0].row_to_json);
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

app.get('/create', redirectIfLoggedOut, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'create.html'));
});

app.get('/profile', redirectIfLoggedOut, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'profile.html'));
});

app.get('/resolved', redirectIfLoggedOut, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'resolved.html'));
});

// Auth Routes
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
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
    failureRedirect: '/login'
  }
));

// Local Auth
app.post(
  '/login', 
  passport.authenticate('local',
  {
    successRedirect: '/',
    failureRedirect: '/login'
  })
);

app.post(
  '/register', 
  [
    check('username').isLength({ min: 3 }).escape(),
    check('email').isEmail().normalizeEmail(),
    check('password').isLength({ min: 6 }).trim().escape()
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) { console.log (errors); return res.status(422).redirect('/register'); }
    const now = new Date();
    bcrypt.hash(req.body.password, saltRounds, (err, hash) => {
      console.log(uuidv4(), req.body.username, req.body.email, hash, now, now);
      const createUser = {
        text: 'INSERT INTO users (user_id, display_name, email, password, created_on, last_login) VALUES($1, $2, $3, $4, $5, $6) RETURNING row_to_json(users.*)',
        values: [ uuidv4(), req.body.username, req.body.email, hash, now, now ]
      };
      client.query(createUser, (queryErr, data) => {
        if (err) {
          console.log(err.stack);
        }
        req.login(data.rows[0].row_to_json, (err) => {
          if (err) { return res.redirect('/login') }
          return res.redirect('/');
        })
      });
    });
  }, 
);

app.post(
  '/resetPassword',
  [
    check('email').isEmail().normalizeEmail()
  ], 
  (req, res) => {
  const getUser = {
    text: "SELECT json_build_object('display_name', display_name) FROM users WHERE email = $1",
    values: [req.body.email]
  }; 
  client.query(getUser, (err, data) => {
    if (err) {  return res.render('/login', { errors: err }) }
    const User = data.rows[0].json_build_object;
    const emailBody = require('./emailBody')(User.display_name, req.protocol + '://' + req.get('host'), uuidv4());
    let mailOptions = {
      to: req.body.email,
      subject: 'Password Reset: DO NOT REPLY',
      body: emailBody
    };
    console.log('Sending to', mailOptions.to, '\n', mailOptions.subject, mailOptions.body);
    transporter.sendMail(mailOptions, (err, info) => {
      if (err) { console.log(err); }
      else {
        console.log(`Message ${info.messageId} sent ${info.response}`);
        res.redirect('/login');
      }
    });
  })
  
});

// Null user
app.get('/logout', (req, res) => {
  req.session = null;
  req.user = null;
  res.redirect('/'); 
});

// API 
app.get('/user', redirectIfLoggedOut, (req, res) => {
  res.json(req.user);
});
// Main issue page - Non resolved
app.get('/getIssues', redirectIfLoggedOut, (req, res) => {
  const listIssues = {
    text: "SELECT json_build_object('ticket_id', tickets.ticket_id, 'created_by', users.display_name, 'ticket_subject', tickets.ticket_subject, 'ticket_description', tickets.ticket_description, 'created_on', tickets.created_on) FROM tickets, users WHERE tickets.created_by = users.user_id AND resolved = FALSE;"
  };
  client.query(listIssues, (err, data) => {
    if (err) { res.writeHead(500); }
    else {
      let jsonRows = [];
      for (let row of data.rows) {
        jsonRows.push(row.json_build_object);
      }
      jsonRows = JSON.stringify(jsonRows);
      res.send(jsonRows);
    }
  });
});
// Issues displayed on profile - created by the user
app.get('/getIssues/user', redirectIfLoggedOut, (req, res) => {
  const listIssues = {
    text: "SELECT json_build_object('ticket_id', ticket_id, 'created_by', (SELECT display_name FROM users WHERE tickets.created_by = users.user_id), 'ticket_subject', ticket_subject, 'ticket_description', ticket_description, 'resolved', resolved, 'created_on', tickets.created_on, 'resolved_on', resolved_on, 'resolved_by', (SELECT display_name FROM users WHERE tickets.resolved_by = users.user_id), 'resolved_notes', resolved_notes) FROM tickets INNER JOIN users ON tickets.created_by = users.user_id WHERE tickets.created_by = $1;",
    values: [ req.user.user_id ]
  };
  client.query(listIssues, (err, data) => {
    if (err) { res.writeHead(500); }
    else {
      let jsonRows = []; 
      for (let row of data.rows) {
        jsonRows.push(row.json_build_object);
      }
      jsonRows = JSON.stringify(jsonRows);
      res.send(jsonRows);
    }
  });
});
// Issues displayed on resolved - resolved only
app.get('/getIssues/resolved', redirectIfLoggedOut, (req, res) => {
  const listIssues = {
    text: "SELECT json_build_object('ticket_id', tickets.ticket_id, 'created_by', (SELECT users.display_name AS created_by FROM users WHERE users.user_id = tickets.created_by) , 'ticket_subject', tickets.ticket_subject, 'ticket_description', tickets.ticket_description, 'created_on', tickets.created_on, 'resolved_on', tickets.resolved_on, 'resolved_by', (SELECT users.display_name AS resolved_by FROM users WHERE users.user_id = tickets.resolved_by), 'resolved_notes', tickets.resolved_notes)  FROM tickets WHERE tickets.resolved = TRUE;"
  };
  client.query(listIssues, (err, data) => {
    if (err) { res.writeHead(500); }
    else {
      let jsonRows = [];
      for (let row of data.rows) {
        jsonRows.push(row.json_build_object);
      }
      jsonRows = JSON.stringify(jsonRows);
      res.send(jsonRows);
    }
  });
});

// Create Issue
app.post(
  '/create', 
  [
    redirectIfLoggedOut,
    check('subject').isLength({ min: 3 }).escape(),
    check('description').escape()
  ],
  (req, res) => {
  if (!validationResult(req).isEmpty()) { console.log (validationResult(req)); return res.status(422).redirect('/create'); }
  const now = new Date();
  const createTicket = {
    text: 'INSERT INTO tickets(created_by, ticket_subject, ticket_description, created_on) VALUES($1, $2, $3, $4)',
    values: [ req.user.user_id, req.body.subject, req.body.description, now]
  };
  client.query(createTicket, (err, data) => {
    if (err) { console.log(err.stack); }
  });
  res.redirect('/');
});
// Resolving an issue route
app.post(
  '/resolve',
  [
    redirectIfLoggedOut,
    check('resolved_notes').escape(),
    check('ticket_id').isNumeric()
  ],
  (req, res) => {
  const now = new Date();
  const resolveTicket = {
    text: 'UPDATE tickets SET resolved = TRUE, resolved_on = $1, resolved_by = $2, resolved_notes = $3 WHERE ticket_id = $4',
    values: [ now, req.user.user_id, req.body.resolved_notes, req.body.ticket_id ]
  };
  client.query(resolveTicket, (err, data) => {
    if(err) { console.log(err.stack); }
    res.redirect(req.header('Referer'));
  });
});

app.use(express.static('public', { extensions: ['html']} ));
app.all('/*', redirectIfLoggedOut, (req, res) => {
  res.redirect('/');
});

app.listen(PORT);