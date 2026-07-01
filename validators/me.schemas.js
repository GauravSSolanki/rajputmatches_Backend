const { z } = require("zod");
const { trimmedString, withData } = require("./common.schemas");
const { GENDERS } = require("../utils/constants");

const heightSchema = z
  .object({
    feet: z.number().int().min(1).max(8).optional(),
    inches: z.number().int().min(0).max(11).optional(),
  })
  .optional();

const addressSchema = z
  .object({
    country: trimmedString(100),
    state: trimmedString(100),
    district: trimmedString(100),
    city: trimmedString(100),
    street: trimmedString(200),
    zipCode: trimmedString(20),
  })
  .optional();

const updateBasicProfileDataSchema = z
  .object({
    firstName: z.string().trim().min(1).max(50).optional(),
    middleName: trimmedString(50),
    lastName: z.string().trim().min(1).max(50).optional(),
    height: heightSchema,
    weight: z.number().min(20).max(300).nullable().optional(),
    maritalStatus: z
      .enum(["Single", "Married", "Divorced", "Widowed", ""])
      .optional(),
    additionalInfo: trimmedString(500),
    profilefor: trimmedString(50),
    address: addressSchema,
    isVisible: z.boolean().optional(),
    gender: z.enum([GENDERS.MALE, GENDERS.FEMALE, GENDERS.OTHER, ""]).optional(),
    dateOfBirth: z.coerce.date().optional(),
  })
  .strict();

const professionalDataSchema = z
  .object({
    qualifications: trimmedString(200),
    institution: trimmedString(200),
    professional: trimmedString(200),
    annualIncome: trimmedString(50),
    hobbies: z.array(z.string().trim().max(50)).max(20).optional(),
    additionalInfo: trimmedString(100),
    class: trimmedString(100),
  })
  .strict();

const horoscopeDataSchema = z
  .object({
    dateOfBirth: trimmedString(30),
    birthHour: trimmedString(2),
    birthMinute: trimmedString(2),
    birthTimePeriod: z.enum(["AM", "PM"]).optional(),
    birthplace: trimmedString(100),
    birthCity: trimmedString(100),
    birthState: trimmedString(100),
    birthCountry: trimmedString(100),
    maglik: z.enum(["Yes", "No", ""]).optional(),
    religion: trimmedString(50),
    clan: trimmedString(100),
    subclan: trimmedString(100),
    gotra: trimmedString(100),
    additionalInfo: trimmedString(500),
  })
  .strict();

const familyDataSchema = z
  .object({
    fatherName: trimmedString(100),
    occupation: trimmedString(100),
    fatherNativePlace: trimmedString(100),
    motherName: trimmedString(100),
    motherNativePlace: trimmedString(100),
    maternalGotra: trimmedString(100),
    siblings: trimmedString(200),
    familyLocation: trimmedString(200),
    additionalMaternal: trimmedString(500),
    familyInfo: trimmedString(500),
  })
  .strict();

const relativeBadePapaSchema = z
  .object({
    name: trimmedString(30),
    marriedto: trimmedString(30),
    daughterof: trimmedString(30),
    thikana: trimmedString(30),
  })
  .strict();

const relativeKakosaSchema = z
  .object({
    name: trimmedString(30),
    marriedTo: trimmedString(30),
    daughterOf: trimmedString(30),
    thikana: trimmedString(30),
  })
  .strict();

const relativeBhuasaSchema = z
  .object({
    name: trimmedString(30),
    marriedto: trimmedString(30),
    sonof: trimmedString(30),
    thikana: trimmedString(30),
  })
  .strict();

const extendedFamilyDataSchema = z
  .object({
    grandFatherName: trimmedString(30),
    grandFathersonOf: trimmedString(30),
    grandFatheroccupation: trimmedString(30),
    grandFatherthikana: trimmedString(30),
    grandMotherName: trimmedString(30),
    grandMotherdaughterOf: trimmedString(30),
    grandmotherthikana: trimmedString(30),
    maternalGrandFatherName: trimmedString(30),
    maternalGrandFatherthikana: trimmedString(30),
    maternalGrandFathersonOf: trimmedString(30),
    maternalGrandFatheroccupation: trimmedString(30),
    maternalGrandMotherName: trimmedString(30),
    maternalGrandMotherdaughterOf: trimmedString(30),
    maternalGrandMotherthikana: trimmedString(30),
    badePapa: z.array(relativeBadePapaSchema).max(20).optional(),
    kakosa: z.array(relativeKakosaSchema).max(20).optional(),
    bhuasa: z.array(relativeBhuasaSchema).max(20).optional(),
    mamosa: z.array(relativeKakosaSchema).max(20).optional(),
    masisa: z.array(relativeBhuasaSchema).max(20).optional(),
  })
  .strict();

module.exports = {
  updateBasicProfileSchema: withData(updateBasicProfileDataSchema),
  updateProfessionalSchema: withData(professionalDataSchema),
  updateHoroscopeSchema: withData(horoscopeDataSchema),
  updateFamilySchema: withData(familyDataSchema),
  updateExtendedFamilySchema: withData(extendedFamilyDataSchema),
};
