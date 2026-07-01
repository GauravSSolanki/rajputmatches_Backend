/**
 * Central model registry — import models from here in new code.
 *
 * Example:
 *   const { MatrimonialUser, MediaAlbum } = require("../models");
 */
const MatrimonialUser = require("./UserProfile");
const MediaAlbum = require("./PhotoSchema");
const PasswordResetToken = require("./tokenSchema");
const EmailVerificationToken = require("./EmailVerifySchema");
const VerifiedEmail = require("./VerifiedEmailSchema");
const Notification = require("./NotificationSchema");
const Story = require("./StoriesSchema");
const SubscriptionLimit = require("./LimitSchema");
const CmsPage = require("./PageModel");
const IdCounter = require("./CounterModel");
const ChatMessage = require("./Messages");
const Chat = require("./Chat");
const ContactRequest = require("./ContactRequest");
const ProfessionalProfile = require("./ProfessionalDetails");
const HoroscopeProfile = require("./HoroscopeDetails");
const FamilyProfile = require("./FamilyDetails");
const ExtendedFamilyProfile = require("./ExtendedFamilyDetails");
const ProfileVisit = require("./ProfileVisit");
const Shortlist = require("./Shortlist");
const PhotoAccessRequest = require("./PhotoRequest");
const ConnectionRequest = require("./ProfileConnectionRequest");
const Admin = require("./Admin");
const UserAction = require("./UserActionsSchema");

module.exports = {
  MatrimonialUser,
  MediaAlbum,
  PasswordResetToken,
  EmailVerificationToken,
  VerifiedEmail,
  Notification,
  Story,
  SubscriptionLimit,
  CmsPage,
  IdCounter,
  ChatMessage,
  Chat,
  ContactRequest,
  ProfessionalProfile,
  HoroscopeProfile,
  FamilyProfile,
  ExtendedFamilyProfile,
  ProfileVisit,
  Shortlist,
  PhotoAccessRequest,
  ConnectionRequest,
  Admin,
  UserAction,

  // Backward-compatible aliases (old variable names)
  User: MatrimonialUser,
  UserProfile: MatrimonialUser,
  Photo: MediaAlbum,
  PhotoSchema: MediaAlbum,
  Token: PasswordResetToken,
  Page: CmsPage,
  Limit: SubscriptionLimit,
  Counter: IdCounter,
  Message: ChatMessage,
  Stories: Story,
  ProfessionalDetails: ProfessionalProfile,
  HoroscopeDetails: HoroscopeProfile,
  FamilyDetails: FamilyProfile,
  ExtendedFamily: ExtendedFamilyProfile,
  ExtendedFamilyDetails: ExtendedFamilyProfile,
  PhotoRequest: PhotoAccessRequest,
  ProfileConnectionRequest: ConnectionRequest,
};
