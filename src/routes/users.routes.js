import { Router } from "express";
import {
  registerUser,
  logoutUser,
  loginUser,
  refreshAccessToken,
  changeCurrentPassowrd,
  getCurrentUser,
  getUserChannelProfile,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getWatchHistory,
} from "../controllers/user.controllers.js";
import { upload } from "../middlewares/multer.middlewares.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
const userRouter = Router();
userRouter.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  registerUser
);

userRouter.route("/login").post(loginUser);
userRouter.route("/refresh-token").post(refreshAccessToken);

userRouter.route("/logout").post(verifyJWT, logoutUser);
userRouter.route("/change-password").post(verifyJWT, changeCurrentPassowrd);
userRouter.route("/current-user").get(verifyJWT, getCurrentUser);
userRouter.route("/c/:username").get(verifyJWT, getUserChannelProfile);
userRouter.route("/update-account").patch(verifyJWT, updateAccountDetails);
userRouter
  .route("/avatar")
  .patch(verifyJWT, upload.single("avatar"), updateUserAvatar);
userRouter
  .route("/cover-image")
  .patch(verifyJWT, upload.single("coverImage"), updateUserCoverImage);
userRouter.route("/history").get(verifyJWT, getWatchHistory);

export default Router;
