import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";
import dotenv from "dotenv";

dotenv.config();
const MONGODB_URI = process.env.MONGODB_URI;

const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(
      `${MONGODB_URI}/${DB_NAME}`
    );

    console.log(
      `MongoDB Connected  DB host:${connectionInstance.connection.host}`
    );
  } catch (error) {
    console.log("MongoDB Connection error", error);
    process.exit(1);
  }
};

export default connectDB;
