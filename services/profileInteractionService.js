const mongoose = require("mongoose");
const {
  MatrimonialUser,
  ProfileVisit,
  Shortlist,
  PhotoAccessRequest,
  ConnectionRequest,
} = require("../models");
const {
  getAcceptedPhotoOwnerIdsForRequester,
  hasAcceptedConnection,
  hasAcceptedPhotoAccess,
  hasActiveConnection,
  enrichProfileForViewer,
  filterFilesForViewer,
  hasPhotoAccess,
  isProfileLocked,
  applyLockedProfileVisibility,
} = require("../utils/profileAccess");

const PROFILE_POPULATE = [
  { path: "HoroscopicId", select: "clan" },
  { path: "filesId", select: "photos isPrivate" },
  { path: "profdetailsId", select: "qualifications class" },
  { path: "familydetailsId", select: "occupation" },
];

const PROFILE_LIST_SELECT =
  "firstName lastName middleName height gender dateOfBirth HoroscopicId filesId profdetailsId address familydetailsId martrId avatar isVisible";

const SHORTLIST_PROFILE_SELECT =
  "middleName lastName height dateOfBirth gender martrId avatar isVisible";

async function recordProfileVisit(visitorId, visitedUserId) {
  const visitorObjectId = new mongoose.Types.ObjectId(visitorId);
  const visitedObjectId = new mongoose.Types.ObjectId(visitedUserId);

  const existing = await ProfileVisit.findOne({
    visitorId: visitorObjectId,
    visitedUserId: visitedObjectId,
  });

  if (!existing) {
    await MatrimonialUser.findByIdAndUpdate(visitedUserId, { $inc: { view: 1 } });
  }

  return ProfileVisit.findOneAndUpdate(
    { visitorId: visitorObjectId, visitedUserId: visitedObjectId },
    { visitedAt: new Date() },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function getVisitedProfileIds(visitorId) {
  const visits = await ProfileVisit.find({ visitorId })
    .sort({ visitedAt: -1 })
    .select("visitedUserId");
  return visits.map((visit) => visit.visitedUserId);
}

async function getVisitorProfileIds(visitedUserId) {
  const visits = await ProfileVisit.find({ visitedUserId })
    .sort({ visitedAt: -1 })
    .select("visitorId");
  return visits.map((visit) => visit.visitorId);
}

async function populateProfilesForViewer(profileIds, viewerId) {
  if (!profileIds.length) return [];

  const acceptedPhotoOwnerIds = await getAcceptedPhotoOwnerIdsForRequester(
    viewerId
  );

  const profiles = await MatrimonialUser.find({ _id: { $in: profileIds } })
    .select(PROFILE_LIST_SELECT)
    .populate(PROFILE_POPULATE)
    .lean();

  const profileMap = new Map(profiles.map((p) => [p._id.toString(), p]));

  const enriched = [];
  for (const id of profileIds) {
    const profile = profileMap.get(id.toString());
    if (!profile) continue;

    const connectionAccess = await hasAcceptedConnection(viewerId, profile._id);
    enriched.push(
      enrichProfileForViewer(profile, viewerId, {
        acceptedPhotoOwnerIds,
        hasConnectionAccess: connectionAccess,
      })
    );
  }

  return enriched;
}

async function addToShortlist(userId, profileId) {
  return Shortlist.findOneAndUpdate(
    { userId, profileId },
    { $setOnInsert: { dateShortlisted: new Date() } },
    { upsert: true, new: true }
  );
}

async function removeFromShortlist(userId, profileId) {
  return Shortlist.findOneAndDelete({ userId, profileId });
}

async function toggleShortlistBookmark(userId, profileId) {
  let entry = await Shortlist.findOne({ userId, profileId });

  if (entry) {
    entry.isbookmarked = !entry.isbookmarked;
    await entry.save();
    return entry;
  }

  entry = await Shortlist.create({
    userId,
    profileId,
    isbookmarked: true,
  });
  return entry;
}

async function getShortlistsForUser(userId) {
  return Shortlist.find({ userId })
    .sort({ dateShortlisted: -1 })
    .populate({
      path: "profileId",
      select: SHORTLIST_PROFILE_SELECT,
      populate: PROFILE_POPULATE,
    })
    .lean();
}

async function formatShortlistResponse(userId) {
  const entries = await getShortlistsForUser(userId);
  const acceptedPhotoOwnerIds = await getAcceptedPhotoOwnerIdsForRequester(
    userId
  );

  const shortlisted = entries
    .filter((entry) => entry.profileId)
    .map((entry) => {
      const profile = enrichProfileForViewer(entry.profileId, userId, {
        acceptedPhotoOwnerIds,
        hasConnectionAccess: false,
      });

      return {
        profile,
        isbookmarked: entry.isbookmarked,
        dateShortlisted: entry.dateShortlisted,
      };
    });

  const photoReqSent = await PhotoAccessRequest.find({ requesterId: userId })
    .select("ownerId status")
    .lean();

  return {
    shortlisted,
    photoReqSent: photoReqSent.map((req) => ({
      userId: req.ownerId,
      status: req.status,
    })),
  };
}

async function createPhotoRequest(requesterId, ownerId) {
  return PhotoAccessRequest.findOneAndUpdate(
    { requesterId, ownerId },
    { status: "pending" },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function deletePhotoRequest(requesterId, ownerId) {
  return PhotoAccessRequest.findOneAndDelete({ requesterId, ownerId });
}

async function updatePhotoRequestStatus(ownerId, requesterId, status) {
  return PhotoAccessRequest.findOneAndUpdate(
    { requesterId, ownerId },
    { status },
    { new: true }
  );
}

async function getPhotoRequestsForUser(userId) {
  const [sent, received] = await Promise.all([
    PhotoAccessRequest.find({ requesterId: userId }).lean(),
    PhotoAccessRequest.find({ ownerId: userId }).lean(),
  ]);

  return { sent, received };
}

async function populatePhotoRequestList(requests, populatePath) {
  const userIds = requests.map((req) => req[populatePath]);
  const profiles = await MatrimonialUser.find({ _id: { $in: userIds } })
    .select(
      "dateOfBirth gender martrId address HoroscopicId filesId profdetailsId familydetailsId isVisible"
    )
    .populate(PROFILE_POPULATE)
    .lean();

  const profileMap = new Map(profiles.map((p) => [p._id.toString(), p]));

  return requests.map((req) => ({
    userId: profileMap.get(req[populatePath].toString()) || req[populatePath],
    status: req.status,
    _id: req._id,
  }));
}

async function createConnectionRequest(requesterId, receiverId) {
  return ConnectionRequest.findOneAndUpdate(
    { requesterId, receiverId },
    { status: "pending" },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function deleteConnectionRequest(requesterId, receiverId) {
  return ConnectionRequest.findOneAndDelete({
    requesterId,
    receiverId,
  });
}

async function updateConnectionRequestStatus(receiverId, requesterId, status) {
  return ConnectionRequest.findOneAndUpdate(
    { requesterId, receiverId },
    { status },
    { new: true }
  );
}

async function getConnectionRequestsForUser(userId) {
  const [sent, received] = await Promise.all([
    ConnectionRequest.find({ requesterId: userId }).lean(),
    ConnectionRequest.find({ receiverId: userId }).lean(),
  ]);

  return { sent, received };
}

async function getShortlistedProfileIds(userId) {
  const entries = await Shortlist.find({ userId }).select("profileId");
  return entries.map((e) => e.profileId.toString());
}

async function formatPhotoRequestsResponse(userId) {
  const { sent, received } = await getPhotoRequestsForUser(userId);

  const sentFormatted = await populatePhotoRequestList(sent, "ownerId");
  const receivedFormatted = await populatePhotoRequestList(
    received,
    "requesterId"
  );

  const acceptedOwnerIds = new Set(
    sent
      .filter((req) => req.status === "accepted")
      .map((req) => req.ownerId.toString())
  );

  const mapWithPhotoFilter = (items, checkAcceptedMap = false) =>
    items.map((item) => {
      const filesId = item.userId?.filesId;
      const totalPhotos = filesId?.photos?.length || 0;
      const targetId = item.userId?._id?.toString();

      const shouldIncludePhotos =
        item.status === "accepted" ||
        filesId?.isPrivate === false ||
        (checkAcceptedMap && acceptedOwnerIds.has(targetId));

      const filteredPhotos =
        shouldIncludePhotos && filesId?.photos
          ? filesId.photos.filter((photo) => photo.isAvatar)
          : [];

      return {
        userId: {
          ...item.userId,
          filesId: { ...filesId, photos: filteredPhotos, totalPhotos },
        },
        status: item.status,
      };
    });

  return {
    photoReqSent: mapWithPhotoFilter(sentFormatted),
    photoReqReceived: mapWithPhotoFilter(receivedFormatted, true),
  };
}

async function formatConnectionRequestsResponse(userId) {
  const { sent, received } = await getConnectionRequestsForUser(userId);
  const acceptedPhotoOwnerIds = await getAcceptedPhotoOwnerIdsForRequester(
    userId
  );

  const populateConnectionList = async (requests, idField) => {
    const userIds = requests.map((req) => req[idField]);
    const profiles = await MatrimonialUser.find({ _id: { $in: userIds } })
      .select(
        "dateOfBirth HoroscopicId filesId profdetailsId address familydetailsId martrId gender isVisible"
      )
      .populate(PROFILE_POPULATE)
      .lean();

    const profileMap = new Map(profiles.map((p) => [p._id.toString(), p]));

    return requests.map((req) => {
      const profile = profileMap.get(req[idField].toString());
      const filesId = profile?.filesId;
      const totalPhotos = filesId?.photos?.length || 0;

      const photoAccess =
        acceptedPhotoOwnerIds.has(req[idField].toString()) &&
        req.status === "accepted";

      const shouldIncludePhotos =
        photoAccess || filesId?.isPrivate === false;

      const filteredPhotos =
        shouldIncludePhotos && filesId?.photos
          ? filesId.photos.filter((photo) => photo.isAvatar)
          : [];

      return {
        userId: profile
          ? {
              ...profile,
              filesId: { ...filesId, photos: filteredPhotos, totalPhotos },
            }
          : req[idField],
        status: req.status,
      };
    });
  };

  const [reqSent, reqReceived] = await Promise.all([
    populateConnectionList(sent, "receiverId"),
    populateConnectionList(received, "requesterId"),
  ]);

  return { reqSent, reqReceived };
}

module.exports = {
  PROFILE_POPULATE,
  PROFILE_LIST_SELECT,
  recordProfileVisit,
  getVisitedProfileIds,
  getVisitorProfileIds,
  populateProfilesForViewer,
  addToShortlist,
  removeFromShortlist,
  toggleShortlistBookmark,
  formatShortlistResponse,
  createPhotoRequest,
  deletePhotoRequest,
  updatePhotoRequestStatus,
  getPhotoRequestsForUser,
  populatePhotoRequestList,
  formatPhotoRequestsResponse,
  createConnectionRequest,
  deleteConnectionRequest,
  updateConnectionRequestStatus,
  getConnectionRequestsForUser,
  formatConnectionRequestsResponse,
  getShortlistedProfileIds,
  getAcceptedPhotoOwnerIdsForRequester,
  hasAcceptedConnection,
  hasAcceptedPhotoAccess,
  hasActiveConnection,
  enrichProfileForViewer,
  filterFilesForViewer,
  hasPhotoAccess,
  isProfileLocked,
  applyLockedProfileVisibility,
};
