const { MediaAlbum, MatrimonialUser } = require("../../models");
const { toObjectId } = require("../../utils/objectId.js");
const { asyncHandler } = require("../../utils/asyncHandler.js");
const { convertUploadedFilesToBase64 } = require("../../utils/image.js");
const {
  sendSuccess,
  sendCreated,
  sendNotFound,
  sendBadRequest,
} = require("../../utils/apiResponse.js");

async function findUserAlbum(userId) {
  return MediaAlbum.findOne({ userId: toObjectId(userId) });
}

const getOrCreateMediaAlbum = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  let album = await findUserAlbum(userId);

  if (!album) {
    album = await MediaAlbum.create({ userId: toObjectId(userId) });

    const user = await MatrimonialUser.findById(userId);
    if (user && !user.filesId) {
      user.filesId = album._id;
      await user.save();
    }

    return sendCreated(res, "Media album created", album);
  }

  return sendSuccess(res, "Media album fetched", album);
});

const uploadPhotos = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  if (!req.files || req.files.length === 0) {
    return sendBadRequest(res, "No files uploaded");
  }

  let album = await findUserAlbum(userId);

  if (!album) {
    album = new MediaAlbum({
      userId: toObjectId(userId),
      photos: [],
      documents: [],
    });
  }

  const uploadedUrls = await convertUploadedFilesToBase64(req.files);
  const newPhotos = uploadedUrls.map((url) => ({ url, isAvatar: false }));

  album.photos.push(...newPhotos);
  await album.save();

  return sendSuccess(res, "Photos uploaded successfully", {
    photos: album.photos,
    documents: album.documents,
  });
});

const uploadDocuments = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  if (!req.files || req.files.length === 0) {
    return sendBadRequest(res, "No files uploaded");
  }

  const album = await findUserAlbum(userId);
  if (!album) {
    return sendNotFound(res, "Media album not found. Upload photos first.");
  }

  const uploadedUrls = await convertUploadedFilesToBase64(req.files);
  const newDocuments = uploadedUrls.map((url) => ({ url }));

  album.documents.push(...newDocuments);
  await album.save();

  return sendSuccess(res, "Documents uploaded successfully", {
    photos: album.photos,
    documents: album.documents,
  });
});

const getAvatarPhoto = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const album = await MediaAlbum.findOne(
    { userId: toObjectId(userId), "photos.isAvatar": true },
    { "photos.$": 1, isPrivate: 1, _id: 0 }
  );

  if (!album || !album.photos || album.photos.length === 0) {
    return sendNotFound(res, "Avatar not found");
  }

  return sendSuccess(res, "Avatar fetched", {
    userProfile: album.photos[0],
    isPrivate: album.isPrivate,
  });
});

const setAvatarPhoto = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const photoId = req.validated.data;

  const album = await findUserAlbum(userId);
  const user = await MatrimonialUser.findById(userId);

  if (!album || !user) {
    return sendNotFound(res, "User not found");
  }

  album.photos = album.photos.map((photo) => ({
    ...photo.toObject(),
    isAvatar: photo._id.toString() === photoId,
  }));

  const selectedAvatar = album.photos.find(
    (photo) => photo._id.toString() === photoId
  );

  if (selectedAvatar) {
    user.avatar = selectedAvatar.url;
  }

  await album.save();
  await user.save();

  return sendSuccess(res, "Avatar updated successfully", album);
});

const deleteMediaFile = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const fileId = req.validated.data;

  const album = await findUserAlbum(userId);
  if (!album) {
    return sendNotFound(res, "User not found");
  }

  let deletedFile = album.photos.find((photo) => photo._id.toString() === fileId);

  if (deletedFile) {
    album.photos = album.photos.filter(
      (photo) => photo._id.toString() !== fileId
    );
  } else {
    deletedFile = album.documents.find(
      (document) => document._id.toString() === fileId
    );

    if (!deletedFile) {
      return sendNotFound(res, "File not found");
    }

    album.documents = album.documents.filter(
      (document) => document._id.toString() !== fileId
    );
  }

  const user = await MatrimonialUser.findById(userId);
  if (user && user.avatar === deletedFile.url) {
    user.avatar = "";
    await user.save();
  }

  await album.save();
  return sendSuccess(res, "File deleted successfully", album);
});

const updatePhotoPrivacy = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const isPrivate = req.validated.data;

  const album = await findUserAlbum(userId);
  if (!album) {
    return sendNotFound(res, "Media album not found");
  }

  album.isPrivate = isPrivate;
  await album.save();

  return sendSuccess(res, "Privacy setting updated successfully", album);
});

module.exports = {
  getOrCreateMediaAlbum,
  uploadPhotos,
  uploadDocuments,
  getAvatarPhoto,
  setAvatarPhoto,
  deleteMediaFile,
  updatePhotoPrivacy,
};
