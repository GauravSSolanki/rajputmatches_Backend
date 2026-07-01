/**
 * MongoDB collection names (semantic key → collection string).
 *
 * Default: LEGACY names (existing data in Atlas/local DB).
 * After running `node scripts/migrate-collections.js`, set in .env:
 *   MONGO_USE_LEGACY_COLLECTIONS=0
 */
const STANDARD = Object.freeze({
  MATRIMONIAL_USERS: "matrimonial_users",
  MEDIA_ALBUMS: "media_albums",
  PASSWORD_RESET_TOKENS: "password_reset_tokens",
  EMAIL_VERIFICATION_TOKENS: "email_verification_tokens",
  VERIFIED_EMAILS: "verified_emails",
  NOTIFICATIONS: "notifications",
  STORIES: "stories",
  SUBSCRIPTION_LIMITS: "subscription_limits",
  CMS_PAGES: "cms_pages",
  ID_COUNTERS: "id_counters",
  CHAT_MESSAGES: "chat_messages",
  CHATS: "chats",
  CONTACT_REQUESTS: "contact_requests",
  PROFESSIONAL_PROFILES: "professional_profiles",
  HOROSCOPE_PROFILES: "horoscope_profiles",
  FAMILY_PROFILES: "family_profiles",
  EXTENDED_FAMILY_PROFILES: "extended_family_profiles",
  PROFILE_VISITS: "profile_visits",
  SHORTLISTS: "shortlists",
  PHOTO_ACCESS_REQUESTS: "photo_access_requests",
  CONNECTION_REQUESTS: "connection_requests",
  ADMINS: "admins",
  USER_ACTIONS: "user_actions",
});

const LEGACY = Object.freeze({
  MATRIMONIAL_USERS: "userprofiles",
  MEDIA_ALBUMS: "photos",
  PASSWORD_RESET_TOKENS: "tokenmodels",
  EMAIL_VERIFICATION_TOKENS: "emailverificationtokens",
  VERIFIED_EMAILS: "verifiedemails",
  NOTIFICATIONS: "notifications",
  STORIES: "stories",
  SUBSCRIPTION_LIMITS: "limits",
  CMS_PAGES: "pages",
  ID_COUNTERS: "counters",
  CHAT_MESSAGES: "messages",
  CHATS: "chats",
  CONTACT_REQUESTS: "contactrequests",
  PROFESSIONAL_PROFILES: "professionaldetails",
  HOROSCOPE_PROFILES: "horoscopedetails",
  FAMILY_PROFILES: "familydetails",
  EXTENDED_FAMILY_PROFILES: "extendedfamilies",
  PROFILE_VISITS: "profilevisits",
  SHORTLISTS: "shortlists",
  PHOTO_ACCESS_REQUESTS: "photorequests",
  CONNECTION_REQUESTS: "profileconnectionrequests",
  ADMINS: "admins",
  USER_ACTIONS: "useractions",
});

const useLegacy = process.env.MONGO_USE_LEGACY_COLLECTIONS !== "0";

const COLLECTIONS = useLegacy ? LEGACY : STANDARD;

module.exports = {
  COLLECTIONS,
  COLLECTIONS_STANDARD: STANDARD,
  COLLECTIONS_LEGACY: LEGACY,
};
