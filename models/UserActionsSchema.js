const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserActionsSchema = new Schema({
  userId: { 
    type: Schema.Types.ObjectId, 
    ref: 'UserProfile', 
    required: true 
  }, // Reference to the user performing the action
  actionType: { 
    type: String, 
    required: true, 
    enum: [
      'login', 
      'view_profile', 
      'like_profile', 
      'send_message', 
      'block_user', 
      'report_user', 
      'update_profile', 
      'logout'
    ] 
  }, // Type of action
  targetUserId: { 
    type: Schema.Types.ObjectId, 
    ref: 'UserProfile' 
  }, // Reference to the user being targeted (e.g., viewed, liked, messaged)
  timestamp: { 
    type: Date, 
    default: Date.now 
  }, // When the action occurred
 
});

module.exports = mongoose.model('UserActions', UserActionsSchema);
