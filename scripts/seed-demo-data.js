/**
 * Seed demo users + success stories for local/testing.
 *
 * Usage: node scripts/seed-demo-data.js
 */
require("dotenv").config();
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const {
  MatrimonialUser,
  ProfessionalProfile,
  HoroscopeProfile,
  FamilyProfile,
  Story,
  IdCounter,
} = require("../models");

const DEMO_PASSWORD = "Rajput@123";

const PLACEHOLDER_IMAGE =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIj48cmVjdCBmaWxsPSIjOGIxNTMxIiB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIyNCIgZmlsbD0iI2ZmZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk1hdGNoIFN0b3J5PC90ZXh0Pjwvc3ZnPg==";

const DEMO_USERS = [
  {
    firstName: "Vikram",
    lastName: "Singh",
    gender: "Male",
    email: "vikram.singh@test.rajputmatches.com",
    mobile: "9876501001",
    city: "Jaipur",
    state: "Rajasthan",
    profilefor: "Self",
    professional: {
      qualifications: "MBA",
      professional: "Business Owner",
      class: "Rajput",
      annualIncome: "15-20 LPA",
      hobbies: ["Horse riding", "Travel"],
    },
    horoscope: { religion: "Hindu", clan: "Shekhawat", gotra: "Kashyap" },
    family: {
      fatherName: "Ratan Singh",
      occupation: "Retired Army Officer",
      motherName: "Sunita Singh",
    },
  },
  {
    firstName: "Arjun",
    lastName: "Rathore",
    gender: "Male",
    email: "arjun.rathore@test.rajputmatches.com",
    mobile: "9876501002",
    city: "Jodhpur",
    state: "Rajasthan",
    profilefor: "Self",
    professional: {
      qualifications: "B.Tech",
      professional: "Software Engineer",
      class: "Rajput",
      annualIncome: "10-15 LPA",
      hobbies: ["Cricket", "Reading"],
    },
    horoscope: { religion: "Hindu", clan: "Rathore", gotra: "Gautam" },
    family: {
      fatherName: "Mahendra Rathore",
      occupation: "Government Officer",
      motherName: "Kavita Rathore",
    },
  },
  {
    firstName: "Rahul",
    lastName: "Chauhan",
    gender: "Male",
    email: "rahul.chauhan@test.rajputmatches.com",
    mobile: "9876501003",
    city: "Udaipur",
    state: "Rajasthan",
    profilefor: "Self",
    professional: {
      qualifications: "CA",
      professional: "Chartered Accountant",
      class: "Rajput",
      annualIncome: "12-18 LPA",
      hobbies: ["Photography", "Music"],
    },
    horoscope: { religion: "Hindu", clan: "Chauhan", gotra: "Bharadwaj" },
    family: {
      fatherName: "Suresh Chauhan",
      occupation: "Businessman",
      motherName: "Rekha Chauhan",
    },
  },
  {
    firstName: "Priya",
    lastName: "Singh",
    gender: "Female",
    email: "priya.singh@test.rajputmatches.com",
    mobile: "9876501004",
    city: "Jaipur",
    state: "Rajasthan",
    profilefor: "Self",
    professional: {
      qualifications: "M.Sc",
      professional: "Teacher",
      class: "Rajput",
      annualIncome: "5-8 LPA",
      hobbies: ["Dance", "Cooking"],
    },
    horoscope: { religion: "Hindu", clan: "Kachwaha", gotra: "Vashishtha" },
    family: {
      fatherName: "Bhagwan Singh",
      occupation: "Doctor",
      motherName: "Lata Singh",
    },
  },
  {
    firstName: "Ananya",
    lastName: "Rathore",
    gender: "Female",
    email: "ananya.rathore@test.rajputmatches.com",
    mobile: "9876501005",
    city: "Bikaner",
    state: "Rajasthan",
    profilefor: "Self",
    professional: {
      qualifications: "B.Com",
      professional: "Bank Manager",
      class: "Rajput",
      annualIncome: "8-12 LPA",
      hobbies: ["Yoga", "Painting"],
    },
    horoscope: { religion: "Hindu", clan: "Rathore", gotra: "Kashyap" },
    family: {
      fatherName: "Devendra Rathore",
      occupation: "Advocate",
      motherName: "Poonam Rathore",
    },
  },
];

const DEMO_STORIES = [
  {
    title: "Vikram & Priya — A Jaipur Love Story",
    description:
      "They connected on Rajput Matches in 2024. After matching on values, family background, and clan traditions, their families met in Jaipur and the wedding was celebrated with full Rajput customs.",
    status: true,
  },
  {
    title: "Arjun & Ananya — From Chat to Shaadi",
    description:
      "Arjun from Jodhpur and Ananya from Bikaner started with a connection request. Six months later, they were engaged. Their story shows how thoughtful profiles and verified families build trust.",
    status: true,
  },
  {
    title: "Rahul & Meera — Second Chances, New Beginnings",
    description:
      "Both believed in finding a partner who respected Rajput heritage and modern careers. Rahul's patience and Meera's warmth turned a shortlisted profile into a lifetime partnership.",
    status: true,
  },
  {
    title: "Legacy of Two Royal Families",
    description:
      "When two respected Rajput families discovered each other through our platform, the elders appreciated the detailed horoscope and family sections that made the first meeting smooth and respectful.",
    status: true,
  },
];

async function getNextMartrId() {
  const counter = await IdCounter.findOneAndUpdate(
    { name: "matrimonyId" },
    { $inc: { value: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  if (counter.value < 1000) {
    counter.value = 1000;
    await counter.save();
  }

  return counter.value;
}

async function seedUser(entry, hashedPassword) {
  const existing = await MatrimonialUser.findOne({
    $or: [{ email: entry.email }, { mobile: entry.mobile }],
  });

  if (existing) {
    console.log(`  skip user (exists): ${entry.email}`);
    return existing;
  }

  const martrId = await getNextMartrId();
  const dateOfBirth = new Date("1995-06-15");

  const user = await MatrimonialUser.create({
    firstName: entry.firstName,
    lastName: entry.lastName,
    middleName: "",
    email: entry.email,
    mobile: entry.mobile,
    countryCode: "+91",
    password: hashedPassword,
    dateOfBirth,
    gender: entry.gender,
    profilefor: entry.profilefor,
    martrId,
    role: "user",
    maritalStatus: "Single",
    isApproved: true,
    isbloacked: false,
    isEnable: true,
    isVisible: true,
    isSubscribed: false,
    height: { feet: 5, inches: entry.gender === "Male" ? 10 : 5 },
    weight: entry.gender === "Male" ? 75 : 58,
    address: {
      country: "India",
      state: entry.state,
      city: entry.city,
      district: entry.city,
      street: "Main Road",
      zipCode: "302001",
    },
  });

  const prof = await ProfessionalProfile.create({
    userId: user._id,
    ...entry.professional,
  });

  const horoscope = await HoroscopeProfile.create({
    userId: user._id,
    dateOfBirth: "15-06-1995",
    birthplace: entry.city,
    birthCity: entry.city,
    birthState: entry.state,
    birthCountry: "India",
    maglik: "No",
    ...entry.horoscope,
  });

  const family = await FamilyProfile.create({
    userId: user._id,
    ...entry.family,
    familyLocation: `${entry.city}, ${entry.state}`,
  });

  user.profdetailsId = prof._id;
  user.HoroscopicId = horoscope._id;
  user.familydetailsId = family._id;
  await user.save();

  console.log(`  created user: ${entry.email} (martrId: ${martrId})`);
  return user;
}

async function seedStories() {
  for (const story of DEMO_STORIES) {
    const exists = await Story.findOne({ title: story.title });
    if (exists) {
      console.log(`  skip story (exists): ${story.title}`);
      continue;
    }

    await Story.create({
      ...story,
      image: PLACEHOLDER_IMAGE,
    });
    console.log(`  created story: ${story.title}`);
  }
}

async function run() {
  await mongoose.connect(process.env.DB_URI);
  console.log("Connected to MongoDB\n");

  const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 10);

  console.log("Seeding users...");
  for (const entry of DEMO_USERS) {
    await seedUser(entry, hashedPassword);
  }

  console.log("\nSeeding stories...");
  await seedStories();

  console.log("\n--- Demo login credentials ---");
  console.log(`Password (all users): ${DEMO_PASSWORD}`);
  console.log("Login with email OR mobile as username:\n");
  for (const entry of DEMO_USERS) {
    console.log(
      `  ${entry.firstName} ${entry.lastName} (${entry.gender})`
    );
    console.log(`    Email:  ${entry.email}`);
    console.log(`    Mobile: ${entry.mobile}`);
    console.log("");
  }

  await mongoose.disconnect();
  console.log("Done.");
}

run().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
