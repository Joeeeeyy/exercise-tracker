const express = require('express')
const app = express()
require('dotenv').config()
const mongoose = require('mongoose')

const cors = require('cors')

const bodyParser = require('body-parser')
mongoose.connect(process.env.DB_URI, {useNewUrlParser: true, useUnifiedTopology: true});

let userSchema = new mongoose.Schema({
  _id: String,
  username: String,
  exercise: [
    {
      description: String,
      duration: Number,
      date: Date
    }
  ]
});

let User = mongoose.model('User', userSchema);

app.use(cors())

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

app.use(express.static('public'))

app.get('/', (req, res) => {
  // console.log('working...')
  res.sendFile(__dirname + '/views/index.html');
});

app.get('/api/exercise/new-user', (req, res) => {
  res.json({});
});

app.post('/api/exercise/new-user', (req, res) => {
  let userN = req.body.username;
  // console.log(userN);
  User.findOne({username: userN}, (err, doc) => {
    if (doc) {
      res.json('Username is already taken! Please enter a different username.')
    } else {
      let id = makeid();
      let user = new User({
        _id: id,
        username: userN
      });
      // console.log(user);
      user.save(err, doc => {
        if (err) return console.log("Error: ", err);
        res.json({
          username: userN,
          _id: user._id
        });
      });
    }
  });
});

app.get('/api/exercise/add', (req,res) => {
  
  let input = req.body;

  if(!input.userId || !input.description || !input.duration) {
    res.send('*Please fill all required fields - User ID, Description, and Duration must all be filled.');
  } else if (!input.date) {
    input.date = new Date();
  }
  let date = new Date(input.date).toDateString();
  let duration = parseInt(input.duration);

  let session = {
    description: input.description,
    duration: duration,
    date: date
  };

  User.findByIdAndUpdate(
    input.userId,
    {$push: {exercise: session}},
    (err,doc) => {
      if (err) return console.log("Error: ", err);
      res.json({
        username: doc.username,
        description: session.descriotion,
        duration: session.duration,
        _id: doc._id,
        date: session.date 
      });
    }
  );
});

app.get('/api/exercise/log', (req, res) => {
  let userId = req.query.userId;
  let from = req.query.from;
  let to = req.query.to;
  let limit = req.query.limit;
  
  let userInfo ={};

  if (!from && !to) {
    User.findById(userId, (err, doc) => {
      if (err) return console.log('Error finding ID: ', err);
      if (doc == null) {
        res.send('Unknown UserId. Try again!');
      } else {
        let exercise = doc.exercise;
        let log = [];

        for (let i = 0; i < limitCheck(limit, exercise.length); i++) {
          log.push({
            activity: exercise[i].description,
            duration: exercise[i].duration,
            date: exercise[i].date
          });
        }
        userInfo = {
          _id: userId,
          username: doc.username,
          count: log.length,
          log: log
        };
        res.json(userInfo);
      }
    });
  } else {
    User.find()
    .where('_id')
    .equals(userId)
    .where('exercise.date')
    .gt(from)
    .lt(to)
    .exec((err, doc) => {
      if (err) return console.log('Error: ', err);
      if (doc.length == 0) {
        res.send('Error - Check information in date range.');
      } else {
        let exercise = doc[0].exercise;
        let log =[];
        for (let i = 0; i < limitCheck(limit, exercise.length); i++) {
          log.push({
            activity: exercise[i].description,
            duration: exercise[i].duration,
            date: exercise[i].date
          });
        }
        userInfo = {
          _id: userId,
          username: doc[0].username,
          count: log.length,
          log: log
        };
        res.json(userInfo);
      }
    });
  }
  let limitCheck = (i, j) => {
    if (i <= j) {
      return i;
    } else {
      return j;
    }
  };
});

app.use((req, res) => {
  return next({ status: 404, message: 'not found' });
});

app.use((err, req, res, next) => {
  let errCode, errMsg;

  if (err.errors) {
    errCode = 400; // bad request
    const keys = Object.keys(err.errors);
    
    errMsg = err.errors[keys[0]].message;
  } else {
    errCode = err.status || 500;
    err.Msg = err.message || 'Internal Server Error';
  }
  res.status(errCode)
  .type('txt')
  .send(errMsg);
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});

makeId = () => {
  let randomText = ''; // makes random short ID
  let alphaNum = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (let i = 0; i < 5; i++) {
    randomText += alphaNum.charAt(Math.floor(Math.random() * alphaNum.length));
  }
  return randomText;
}
