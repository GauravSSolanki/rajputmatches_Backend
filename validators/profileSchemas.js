module.exports = {
  ...require("./me.schemas"),
  saveProfessionalDataSchema: require("./me.schemas").updateProfessionalSchema,
  updateReligionDetailsSchema: require("./me.schemas").updateHoroscopeSchema,
  updateFamilyDetailsSchema: require("./me.schemas").updateFamilySchema,
};
