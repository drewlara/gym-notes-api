'use strict';
const express = require('express');
const passport = require('passport');
const bodyParser = require('body-parser');
const router = express.Router();
const { Workout } = require('./models');

router.use(bodyParser.json());
const jwtAuth = passport.authenticate('jwt', {session: false});

//GET workouts
router.get('/', jwtAuth, (req, res) => {
  const user = req.user.id;
  Workout.find({user: user})
    .then(workouts => {
      const serializedWorkouts = workouts.map(workout => workout.serialize());
      res.status(200).json(serializedWorkouts);
    })
    .catch(err => {
      if (err.reason === 'ValidationError') {
        return res.status(err.code).json(err);
      }
      console.log(err)
      res.status(500).json({code: 500, message: 'Internal server error'});
    })
})

//POST add new workout
router.post('/', jwtAuth, (req, res) => {
  const newWorkout = {
    user: req.user.id,
    name: req.body.name,
    type: req.body.type,
    weight: req.body.weight,
    reps: req.body.reps,
    date: req.body.date,
    comments: req.body.comments || undefined
  }

  Workout.create(newWorkout)
    .then(workout => {
      res.status(201).json(workout.serialize());
    })
    .catch(err => {
      if (err.reason === 'ValidationError') {
        return res.status(err.code).json(err);
      }
      res.status(500).json({code: 500, message: 'Internal server error'});
    })
})

//PUT edit a workout
router.put('/:id', jwtAuth, (req, res) => {
  const requiredFields = req.body.name && req.body.type && req.body.weight && req.body.reps && req.body.date;
  if (requiredFields) {
    Workout.findByIdAndUpdate(req.params.id, {$set: {name: req.body.name, type: req.body.type, weight: req.body.weight, reps: req.body.reps, date: req.body.date, comments: req.body.comments}}, {new: true})
    .then(workout => {
      console.log(workout);
      res.status(200).json(workout.serialize());
    })
    .catch(err => {
      if (err.reason === 'ValidationError') {
        return res.status(err.code).json(err);
      }
      res.status(500).json({code: 500, message: 'Internal server error'});
    })
  }
})

//DELETE delete a workout
router.delete('/:id', jwtAuth, (req, res) => {
  Workout.findByIdAndRemove(req.params.id)
    .then(workout => {
      res.status(200).json(workout.serialize());
    })
    .catch(err => {
      if (err.reason === 'ValidationError') {
        return res.status(err.code).json(err);
      }
      res.status(500).json({code: 500, message: 'Internal server error'});
    })
})

module.exports = {router};