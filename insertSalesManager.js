import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import User from "./models/User.js";

dotenv.config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    const email = "info@petsfolio.com";
    const password = "123456";
    const role = "sales manager";
    const name = "Sales Manager";

    const existing = await User.findOne({ email });
    if (existing) {
      console.log("User already exists, updating password and role");
      const salt = await bcrypt.genSalt(10);
      existing.password = await bcrypt.hash(password, salt);
      existing.role = role;
      existing.name = name;
      await existing.save();
      console.log("User updated successfully");
    } else {
      console.log("Creating new user");
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      const newUser = new User({
        email,
        password: hashedPassword,
        role,
        name
      });
      await newUser.save();
      console.log("User created successfully");
    }
    
    mongoose.disconnect();
  } catch (error) {
    console.error(error);
    mongoose.disconnect();
  }
};

run();
