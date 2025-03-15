import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/users.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { deleteFromCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const generateAccessandRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);

    if (!user) {
      throw new ApiError(404, "Error! User not found!");
    }
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ ValidateBeforeSave: false });
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating Access and Refresh Tokens."
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  const { fullname, email, username, password } = req.body;

  // validation
  if (
    [fullname, username, email, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }
  const existentUser = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (existentUser) {
    throw new ApiError(409, "User with email or username already exists");
  }
  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverLocalPath = req.files?.coverImage[0]?.path;
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing");
  }
  let coverImage = "";
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  if (coverLocalPath) {
    coverImage = await uploadOnCloudinary(coverLocalPath);
  }

  try {
    const user = await User.create({
      fullname,
      avatar: avatar.url,
      coverImage: coverImage.url || "",
      email,
      password,
      username: username.toLowerCase(),
    });

    const createdUser = await User.findById(user._id).select(
      "-password -refreshToken"
    );
    if (!createdUser) {
      throw new ApiError(500, "Something went wrong while registering user");
    }
    return res
      .status(201)
      .json(new ApiResponse(200, createdUser, "User registered successfully"));
  } catch (error) {
    console.log("User creation failed");

    if (avatar) {
      await deleteFromCloudinary(avatar.public._id);
    }
    if (coverImage) {
      await deleteFromCloudinary(coverImage.public._id);
    }
    throw new ApiError(
      500,
      "Something went wrong while registering user and images were deleted"
    );
  }
});

const loginUser = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;
  if (!email) {
    throw new ApiError(400, "Email is required");
  }
  const user = await User.findOne({
    $or: [{ email }, { username }],
  });
  if (!user) {
    throw new ApiError(400, "User not found");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid credentials");
  }
  const { accessToken, refreshToken } = await genertateAccessandRefreshToken(
    user._id
  );

  const loggedIn = await User.findById(user._id).select(
    "-password, -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(200),
      { user: loggedIn, accessToken, refreshToken },
      "User logged in successfully"
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    { new: true }
  );

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, "User logged out successfully!"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;
  if (!incomingRefreshToken) {
    throw new ApiError(402, "Refrsh token is required");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    const user = await User.findById(decodedToken?._id);
    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }
    if (user.incomingRefreshToken !== user.refreshToken) {
      throw new ApiError(401, "Invalid refresh token");
    }

    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    };
    const { accessToken, refreshToken: newRefreshToken } =
      await generateAccessandRefreshToken(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access token refreshed successfully"
        )
      );
  } catch (error) {
    throw new ApiError(
      403,
      "Something went wrong while refreshing access token"
    );
  }
});

const changeCurrentPassowrd = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const user = await User.findById(req.user?._id);

  user.isPasswordValid = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordValid) {
    throw new ApiError(401, "Old Password is incorrect");
  }
  user.password = newPassword;
  await user.save({ ValidateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password Changed Successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user details"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullname, email } = req.body;

  if (!fullname || !email) {
    throw new ApiError(400, "Fullname and email are required");
  }

  const user = User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullname,
        email: email,
      },
    },
    { new: true }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"));
});
const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new ApiError(401, "File is required");
  }
  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar.url) {
    throw new ApiError(400, "Something went wrong while uploading avatar");
  }
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true }
  ).swlect("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar updated successfully"));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverLocalPath = req.file?.path;
  if (!coverLocalPath) {
    throw new ApiError(400, "file is required");
  }
  const coverImage = await uploadOnCloudinary(coverLocalPath);
  if (!coverImage.url) {
    throw new ApiError(500, "spmething went wrong while uploading cover image");
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    { new: true }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Cover image updated successfully"));
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username?.trim()) {
    throw new ApiError(400, "Username is required");
  }

  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      lookup: {
        frpm: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        sunscriberCount: {
          $size: "$subscribers",
        },
        channelsSubscribedTo: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            if: {
              $in: [req.user?._id, "$subscribers.subscriber"],
            },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullname: 1,
        username: 1,
        avatar: 1,
        subscriberCount: 1,
        channelsSubscribedToCount: 1,
        isSubscribed: 1,
        coverImage: 1,
        email: 1,
      },
    },
  ]);

  if (!channel?.length) {
    throw new ApiError(400, "Channel not found");
  }
  return res
    .status(200)
    .json(
      new ApiResponse(200, channel[0], "Channel profile fetched successfully")
    );
});

const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user?._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              frpm: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullname: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
                {
                  $addFields: {
                    owner: {
                      $first: "owner",
                    },
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user[0]?.watchHistory,
        "Watch history fetched successfullu"
      )
    );
});

export {
  registerUser,
  loginUser,
  refreshAccessToken,
  logoutUser,
  changeCurrentPassowrd,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getCurrentUser,
  getWatchHistory,
};
