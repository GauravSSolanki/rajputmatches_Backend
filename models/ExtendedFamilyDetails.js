const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Extended Family Schema with Additional Security
const ExtendedFamilySchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "UserProfile",
      required: true,
      index: true, 
    },
    grandFatherName: {
      type: String,
      trim: true,
      maxlength: 30,
    },
    grandFathersonOf: {
      type: String,
      trim: true,
      maxlength: 30,
    },
    grandFatheroccupation: {
      type: String,
      trim: true,
      maxlength: 30,
    },
    grandFatherthikana: {
      type: String,
      trim: true,
      maxlength: 30,
    },
    grandMotherName: {
      type: String,
      trim: true,
      maxlength: 30,
    },
    grandMotherdaughterOf: {
      type: String,
      trim: true,
      maxlength: 30,
    },
    grandmotherthikana: {
      type: String,
      trim: true,
      maxlength: 30,
    },
    maternalGrandFatherName: {
      type: String,
      trim: true,
      maxlength: 30,
    },
    maternalGrandFatherthikana: {
      type: String,
      trim: true,
      maxlength: 30,
    },
    maternalGrandFathersonOf: {
      type: String,
      trim: true,
      maxlength: 30,
    },
    maternalGrandFatheroccupation: {
      type: String,
      trim: true,
      maxlength: 30,
    },
    maternalGrandMotherName: {
      type: String,
      trim: true,
      maxlength: 30,
    },
    maternalGrandMotherdaughterOf: {
      type: String,
      trim: true,
      maxlength: 30,
    },
    maternalGrandMotherthikana: {
      type: String,
      trim: true,
      maxlength: 30,
    },
    badePapa: [
      {
        name: {
          type: String,
          trim: true,
          maxlength: 30,
        },
        marriedto: {
          type: String,
          trim: true,
          maxlength: 30,
        },
        daughterof: {
          type: String,
          trim: true,
          maxlength: 30,
        },
        thikana: {
          type: String,
          trim: true,
          maxlength: 30,
        },
      },
    ],
    kakosa: [
      {
        name: {
          type: String,
          trim: true,
          maxlength: 30,
        },
        marriedTo: {
          type: String,
          trim: true,
          maxlength: 30,
        },
        daughterOf: {
          type: String,
          trim: true,
          maxlength: 30,
        },
        thikana: {
          type: String,
          trim: true,
          maxlength: 30,
        },
      },
    ],

    bhuasa: [
      {
        name: {
          type: String,
          trim: true,
          maxlength: 30,
        },
        marriedto: {
          type: String,
          trim: true,
          maxlength: 30,
        },
        sonof: {
          type: String,
          trim: true,
          maxlength: 30,
        },
        thikana: {
          type: String,
          trim: true,
          maxlength: 30,
        },
      },
    ],
    mamosa: [
      {
        name: {
          type: String,
          trim: true,
          maxlength: 30,
        },
        marriedTo: {
          type: String,
          trim: true,
          maxlength: 30,
        },
        daughterOf: {
          type: String,
          trim: true,
          maxlength: 30,
        },
        thikana: {
          type: String,
          trim: true,
          maxlength: 30,
        },
      },
    ],
    masisa: [
      {
        name: {
          type: String,
          trim: true,
          maxlength: 30,
        },
        marriedto: {
          type: String,
          trim: true,
          maxlength: 30,
        },
        sonof: {
          type: String,
          trim: true,
          maxlength: 30,
        },
        thikana: {
          type: String,
          trim: true,
          maxlength: 30,
        },
      },
    ],
  },
  {
    timestamps: true, // Automatically add createdAt and updatedAt
    versionKey: false, // Hide the __v version key
  }
);

// Middleware for validation
ExtendedFamilySchema.pre("save", function (next) {
  if (this.grandFatherName && this.grandFatherName.length < 2) {
    return next(
      new Error("Grandfather's name must be at least 2 characters long.")
    );
  }
  next();
});

const { COLLECTIONS } = require("./collections");

module.exports = mongoose.model(
  "ExtendedFamily",
  ExtendedFamilySchema,
  COLLECTIONS.EXTENDED_FAMILY_PROFILES
);
