import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { ApiError, apiError } from "../utils/apiError.js";
import { ApiResponse, apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!isValidObjectId(videoId)) {
    throw new apiError(400, "invalid video id");
  }

  const alreadyLiked = await Like.findOne({
    video: videoId,
    likedBy: req.user?._id,
  });

  if (alreadyLiked) {
    await Like.findByIdAndDelete(alreadyLiked?._id);
    return res
      .status(200)
      .json(new apiResponse(200, { isLiked: false }, "like status toggled"));
  }

  await Like.create({
    video: videoId,
    likedBy: req.user?._id,
  });
  return res
    .status(200)
    .json(new apiResponse(200, { isLiked: true }, "like status toggled"));
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  //TODO: toggle like on comment
  if (!isValidObjectId(commentId)) {
    throw new apiError(400, "invalid comment id");
  }
  const alreadyLiked = await Like.findOne({
    comment: commentId,
    likedBy: req.user?._id,
  });
  if (alreadyLiked) {
    await Like.findByIdAndDelete(alreadyLiked?._id);

    return res
      .status(200)
      .json(
        new apiResponse(200, { isLiked: false }, "comment like status toggled")
      );
  }
  await Like.create({
    comment: commentId,
    likedBy: req.user?._id,
  });
  return res
    .status(200)
    .json(
      new apiResponse(200, { isLiked: true }, "comment like status toggled")
    );
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  if (!isValidObjectId(tweetId)) {
    return new apiError(400, "invalid tweetid");
  }
  const alreadyLiked = await Like.findOne({
    tweet: tweetId,
    likedBy: req.user?._id,
  });
  if (alreadyLiked) {
    await Like.findByIdAndDelete(alreadyLiked?._id);

    return res
      .status(200)
      .json(
        new ApiResponse(200, { tweetId, isLiked: false }, "tweetlike toggled")
      );
  }

  await Like.create({
    tweet: tweetId,
    likedBy: req.user?._id,
  });
  return res
    .status(200)
    .json(
      new ApiResponse(200, { tweetId, isLiked: true }, "tweetlike toggled")
    );
});

const getLikedVideos = asyncHandler(async (req, res) => {
  //TODO: get all liked videos

  const userId = req.user?._id;

  const likedVideosAggregate = await Like.aggregate([
    {
      $match: {
        likedBy: userId,
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "likedVideos",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "ownerDetails",
            },
          },
          {
            $unwind: "$ownerDetails",
          },
        ],
      },
    },
    {
      $unwind: "$likedVideos",
    },

    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      $project: {
        _id: 0,
        likedVideos: {
          _id: 1,
          "videoFile.url": 1,
          "thumbnail.url": 1,
          owner: 1,
          title: 1,
          description: 1,
          views: 1,
          duration: 1,
          createdAt: 1,
          isPublished: 1,
          owrnerDetails: {
            userName: 1,
            fullName: 1,
            "avatar.url": 1,
          },
        },
      },
    },
  ]);
  return res
    .status(200)
    .json(
      new apiResponse(
        200,
        likedVideosAggregate,
        "liked videos fetched sucessfully"
      )
    );
});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
