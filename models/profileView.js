const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const VisitedProfileSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'UserProfile',  
    required: true,
  },
  visitedUserId: {
    type: Schema.Types.ObjectId,
    ref: 'UserProfile',  
    required: true,
  },
  visitedAt: {
    type: Date,
    default: Date.now,  
  },
});

// Define the ProfileViewSchema
const ProfileViewSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'UserProfile', 
    required: true,
  },
  viewedUserId: {
    type: Schema.Types.ObjectId,
    ref: 'UserProfile',  // Reference to the profile that has been viewed
    required: true,
  },
  viewedAt: {
    type: Date,
    default: Date.now,  // Timestamp of when the profile was viewed
  },
});

const VisitedProfile = mongoose.model('VisitedProfile', VisitedProfileSchema);
const ProfileView = mongoose.model('ProfileView', ProfileViewSchema);

module.exports = { VisitedProfile, ProfileView };
