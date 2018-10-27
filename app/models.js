'use strict';
const mongoose = require('mongoose');

mongoose.Promise = global.Promise;

const WorkoutSchema = mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  name: {
    type: String, 
    required: true
  },
  type: {
    type: String, 
    required: true
  },
  weight: {
    type: String, 
    required: true
  },
  reps: {
    type: String, 
    required: true
  },
  date: {
    type: Date, 
    required: true
  },
  comments: {type: String, default: undefined}
});

WorkoutSchema.methods.serialize = function() {
  return {
    id: this._id,
    name: this.name,
    type: this.type,
    weight: this.weight,
    reps: this.reps,
    date: this.date,
    comments: this.comments
  }
}

const Workout = mongoose.model('Workout', WorkoutSchema);

module.exports = {Workout}