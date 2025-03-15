// id string pk
//   comment ObjectId comments
//   video ObjectId videos
//   likedBy ObjectId users
//   tweet ObjectId tweets
//   createdAt Date
//   updatedAt Date
import mongoose, { Schema } from "mongoose";

const likesSchema = new Schema(
  {
    comment: {
      type: Schema.Types.ObjectId,
      ref: "Comments",
    },
    video: {
      type: Schema.Types.ObjectId,
      ref: "Video",
    },
    likedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    tweet: {
      type: Schema.Types.ObjectId,
      ref: "Tweets",
    },
  },
  { timestamps: true }
);
export const Like = mongoose.model("Likes", likesSchema);
