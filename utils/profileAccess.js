const {
  PhotoAccessRequest: PhotoRequest,
  ConnectionRequest: ProfileConnectionRequest,
} = require("../models");

const isProfileLocked = (profile) =>
  profile?.isVisible === false || profile?.isVisible === "false";

const buildAcceptedOwnerIdSet = (photoRequests) =>
  new Set(
    (photoRequests || [])
      .filter((req) => req.status === "accepted")
      .map((req) => (req.ownerId || req.userId)?._id?.toString() || req.ownerId?.toString() || req.userId?.toString())
  );

const hasPhotoAccess = (ownerId, acceptedOwnerIds, filesId) => {
  if (!filesId?.isPrivate) return true;
  return acceptedOwnerIds.has(ownerId?.toString());
};

const filterFilesForViewer = (
  filesId,
  hasAccess,
  { avatarOnly = false, limit } = {}
) => {
  if (!filesId) {
    return { photos: [], isPrivate: false, totalPhotos: 0 };
  }

  const totalPhotos = filesId.photos?.length || 0;

  if (filesId.isPrivate && !hasAccess) {
    return { ...filesId, photos: [], totalPhotos };
  }

  let photos = filesId.photos || [];
  if (avatarOnly) {
    photos = photos.filter((photo) => photo.isAvatar);
  }
  if (typeof limit === "number") {
    photos = photos.slice(0, limit);
  }

  return { ...filesId, photos, totalPhotos };
};

const applyLockedProfileVisibility = (profile, hasConnectionAccess) => {
  if (!isProfileLocked(profile) || hasConnectionAccess) {
    return profile;
  }

  return {
    _id: profile._id,
    firstName: profile.firstName,
    lastName: profile.lastName,
    middleName: profile.middleName,
    gender: profile.gender,
    dateOfBirth: profile.dateOfBirth,
    martrId: profile.martrId,
    height: profile.height,
    avatar: profile.avatar,
    isVisible: profile.isVisible,
    isProfileLocked: true,
    filesId: filterFilesForViewer(profile.filesId, false),
  };
};

const enrichProfileForViewer = (
  profile,
  viewerId,
  { acceptedPhotoOwnerIds, hasConnectionAccess }
) => {
  if (!profile) return profile;

  const profileObj =
    typeof profile.toObject === "function" ? profile.toObject() : { ...profile };

  const locked = applyLockedProfileVisibility(
    profileObj,
    hasConnectionAccess
  );

  if (locked.isProfileLocked) {
    return locked;
  }

  const photoAccess = hasPhotoAccess(
    profileObj._id,
    acceptedPhotoOwnerIds,
    profileObj.filesId
  );

  return {
    ...profileObj,
    HoroscopicId: profileObj.HoroscopicId || {},
    profdetailsId: profileObj.profdetailsId || {},
    familydetailsId: profileObj.familydetailsId || {},
    filesId: filterFilesForViewer(profileObj.filesId, photoAccess, {
      avatarOnly: true,
    }),
  };
};

async function getAcceptedPhotoOwnerIdsForRequester(requesterId) {
  const requests = await PhotoRequest.find({
    requesterId,
    status: "accepted",
  }).select("ownerId");

  return new Set(requests.map((req) => req.ownerId.toString()));
}

async function hasAcceptedPhotoAccess(requesterId, ownerId) {
  const request = await PhotoRequest.findOne({
    requesterId,
    ownerId,
    status: "accepted",
  });
  return !!request;
}

async function hasAcceptedConnection(requesterId, receiverId) {
  const request = await ProfileConnectionRequest.findOne({
    requesterId,
    receiverId,
    status: "accepted",
  });
  return !!request;
}

async function hasActiveConnection(requesterId, receiverId) {
  const request = await ProfileConnectionRequest.findOne({
    requesterId,
    receiverId,
    status: { $ne: "rejected" },
  });
  return !!request;
}

module.exports = {
  isProfileLocked,
  buildAcceptedOwnerIdSet,
  hasPhotoAccess,
  filterFilesForViewer,
  applyLockedProfileVisibility,
  enrichProfileForViewer,
  getAcceptedPhotoOwnerIdsForRequester,
  hasAcceptedPhotoAccess,
  hasAcceptedConnection,
  hasActiveConnection,
};
