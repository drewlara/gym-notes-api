'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const jwt = require('jsonwebtoken');
const faker = require('faker');
const mongoose = require('mongoose');

const { app, runServer, closeServer } = require('../server');
const { User } = require('../users');
const { Workout } = require('../app/models');
const { JWT_SECRET, TEST_DATABASE_URL } = require('../config');

const expect = chai.expect;

chai.use(chaiHttp);

var userID;

function seedWorkoutData(){
  let seedData = [];

  for (let i = 0; i < 10; i++){
    seedData.push(generateWorkoutData())
  }

  return Workout.insertMany(seedData);
}

function generateWorkoutData(){
  const types = ['Arms', 'Shoulders', 'Back', 'Chest', 'Legs'];
  return {
    user: userID,
    name: faker.lorem.sentence(2),
    type: types[Math.floor(Math.random() * 5)],
    weight: Math.floor(Math.random() * 101 + 5).toString(),
    reps: Math.floor(Math.random() * 31 + 5).toString(),
    date: Date.now(),
    comments: faker.lorem.paragraph(2)
  }
}

function tearDownDb() {
  console.warn('Deleting database');
  return mongoose.connection.dropDatabase();
}

describe('Workout endpoints', function () {
  const username = 'exampleUser';
  const password = 'examplePass';
  const firstName = 'Example';
  const lastName = 'User';

  before(function () {
    return runServer(TEST_DATABASE_URL);
  });

  after(function () {
    return closeServer();
  });

  beforeEach(function () {
    return User.hashPassword(password).then(password =>
      User.create({
        username,
        password,
        firstName,
        lastName
      })
      .then(user => {
        userID = user._id
      })
    );
  });

  beforeEach(function () {
    return seedWorkoutData()
  });

  afterEach(function () {
    return User.remove({});
  });

  afterEach(function () {
    return tearDownDb();
  })

  describe('GET Routes', function () {
    it('Should reject requests with no credentials', function () {
      return chai
        .request(app)
        .get('/api/workouts')
        .then(() =>
          expect.fail(null, null, 'Request should not succeed')
        )
        .catch(err => {
          if (err instanceof chai.AssertionError) {
            throw err;
          }

          const res = err.response;
          expect(res).to.have.status(401);
        });
    });

    it('Should reject requests with an invalid token', function () {
      const token = jwt.sign(
        {
          username,
          firstName,
          lastName
        },
        'wrongSecret',
        {
          algorithm: 'HS256',
          expiresIn: '7d'
        }
      );

      return chai
        .request(app)
        .get('/api/workouts')
        .set('Authorization', `Bearer ${token}`)
        .then(() =>
          expect.fail(null, null, 'Request should not succeed')
        )
        .catch(err => {
          if (err instanceof chai.AssertionError) {
            throw err;
          }

          const res = err.response;
          expect(res).to.have.status(401);
        });
    });
    it('Should reject requests with an expired token', function () {
      const token = jwt.sign(
        {
          user: {
            username,
            firstName,
            lastName
          },
          exp: Math.floor(Date.now() / 1000) - 10 // Expired ten seconds ago
        },
        JWT_SECRET,
        {
          algorithm: 'HS256',
          subject: username
        }
      );

      return chai
        .request(app)
        .get('/api/workouts')
        .set('authorization', `Bearer ${token}`)
        .then(() =>
          expect.fail(null, null, 'Request should not succeed')
        )
        .catch(err => {
          if (err instanceof chai.AssertionError) {
            throw err;
          }

          const res = err.response;
          expect(res).to.have.status(401);
        });
    });
    it('Should send protected workout data', function () {
      let workout;
      const token = jwt.sign(
        {
          user: {
            username,
            firstName,
            lastName,
            id: userID
          }
        },
        JWT_SECRET,
        {
          algorithm: 'HS256',
          subject: username,
          expiresIn: '7d'
        }
      );

      return chai
        .request(app)
        .get('/api/workouts')
        .set('authorization', `Bearer ${token}`)
        .then(res => {
          expect(res).to.have.status(200);
          expect(res.body).to.be.an('array');
          expect(res.body.length).to.equal(10);
          
          workout = res.body[0];
          return Workout.findById(workout.id)
        })
        .then(foundWorkout => {
          expect(foundWorkout.name).to.equal(workout.name);
          expect(foundWorkout.type).to.equal(workout.type);
          expect(foundWorkout.weight).to.equal(workout.weight);
          expect(foundWorkout.reps).to.equal(workout.reps);
          expect(foundWorkout.comments).to.equal(workout.comments);
        })
    });
  });

  describe('POST Routes', function () {
    it('Should add a new workout', function () {
      let workout = generateWorkoutData()
      const token = jwt.sign(
        {
          user: {
            username,
            firstName,
            lastName,
            id: userID
          }
        },
        JWT_SECRET,
        {
          algorithm: 'HS256',
          subject: username,
          expiresIn: '7d'
        }
      );

      return chai
        .request(app)
        .post('/api/workouts').send(workout)
        .set('authorization', `Bearer ${token}`)
        .then(res => {
          expect(res.body).to.be.an('object');
          expect(res.body).to.have.keys(
            'name',
            'type',
            'weight',
            'reps',
            'comments',
            'id',
            'author',
            'date'
          );
          
          return Workout.findById(res.body.id)
        })
        .then(foundWorkout => {
          expect(foundWorkout.name).to.equal(workout.name);
          expect(foundWorkout.type).to.equal(workout.type);
          expect(foundWorkout.weight).to.equal(workout.weight);
          expect(foundWorkout.reps).to.equal(workout.reps);
          expect(foundWorkout.comments).to.equal(workout.comments);
        })
    });
  });

  describe('PUT Routes', function () {
    it('Update a new workout', function () {
      let workoutData = generateWorkoutData();
      const updateData = {
        name: workoutData.name,
        type: workoutData.type,
        weight: workoutData.weight,
        reps: workoutData.reps,
        comments: workoutData.comments,
        date: Date.now()
      }
      const token = jwt.sign(
        {
          user: {
            username,
            firstName,
            lastName,
            id: userID
          }
        },
        JWT_SECRET,
        {
          algorithm: 'HS256',
          subject: username,
          expiresIn: '7d'
        }
      );
      
      return Workout.findOne()
        .then(workout => {
          updateData.id = workout._id
          return chai
            .request(app)
            .put(`/api/workouts/${workout._id}`).send(updateData)
            .set('authorization', `Bearer ${token}`)
        })
        .then(res => {
          expect(res).to.have.status(200);

          return Workout.findById(updateData.id)
        })
        .then(foundWorkout => {
          expect(foundWorkout.name).to.equal(updateData.name);
          expect(foundWorkout.type).to.equal(updateData.type);
          expect(foundWorkout.weight).to.equal(updateData.weight);
          expect(foundWorkout.reps).to.equal(updateData.reps);
          expect(foundWorkout.comments).to.equal(updateData.comments);
        })

    })
  });
});
