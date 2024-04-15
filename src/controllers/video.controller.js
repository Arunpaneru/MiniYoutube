import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError, apiError } from "../utils/apiError.js";
import { ApiResponse, apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { fileUploadOnCloudinary } from "../utils/fileUpload.js";
import { Like } from "../models/like.model.js";
import { Comment } from "../models/comment.model.js";

//PUBLISHING THE VIDEO
const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  if ([title, description].some((field) => field?.trim() === "")) {
    throw new apiError(400, "title and descriptions are required");
  }
  const videoLocalPath = req.file?.videoFile[0].path;
  const thumbnailLocalPath = req.file?.thumbnail[0].path;

  if (!videoLocalPath) {
    throw new apiError(400, "videolocalpath is missing");
  }
  if (!thumbnailLocalPath) {
    throw new apiError(400, "thumbnailLocalPaath is missing");
  }

  const videoFile = await fileUploadOnCloudinary(videoLocalPath);
  const thumbnail = await fileUploadOnCloudinary(thumbnailLocalPath);

  if (!videoFile) {
    throw new apiError(400, "videoFile response from cloudinary is missing");
  }
  if (!thumbnail) {
    throw new apiError(400, "videoFile response from cloudinary is missing");
  }

  const video = await Video.create({
    title,
    description,
    duration: videoFile.duration,
    videoFile: {
      url: videoFile.url,
      public_id: videoFile.public_id,
    },
    thumbnail: {
      url: thumbnail.url,
      public_id: thumbnail.public_id,
    },
    owner: req.user?._id,
    isPublished: false,
  });

  const uploadedVideo = Video.findById(video._id);

  if (!uploadedVideo) {
    throw new apiError(500, "video upload failed");
  }

  res.status(200).json(new apiResponse(200, video, "video upload completed"));
});
//EXTRACTING ALL UPLOADED VIDEOS

const getAllVideos = asyncHandler(async (req, res) => {
  //TODO: get all videos based on query, sort, pagination
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
  const pipeline = [];
  if (!query) {
    throw new apiError(400, "query is missing");
  }
  console.log(userId);

  if (query) {
    pipeline.push({
      $search: {
        index: "search-videos",
        text: {
          query: query,
          path: ["title", "description"],
        },
      },
    });
  }

  if (!userId) {
    throw new apiError("userId is missing");
  }
  if (userId) {
    pipeline.push({
      $match: {
        owner: userId,
      },
    });
  }

  //fetching data that are published

  pipeline.push({
    $match: {
      isPublished: true,
    },
  });
  //sorting data based on the provided sorting type and
  // if not given sorting according to created date in descending order
  if (sortBy && sortType) {
    pipeline.push({
      $sort: {
        [sortBy]: sortType === "asc" ? 1 : -1,
      },
    });
  } else {
    pipeline.push({ $sort: { createdAt: -1 } });
  }
  //here we also have the field owner so need to perform (join operation as in sql)
  // to get owner whose details are mentioned in document "users"
  // so lookuup is aggregation stage that performs required operation
  pipeline.push(
    {
      $lookup: {
        from: "users",
        localField: owner,
        foreignField: _id,
        as: "ownerDetails",
        pipeline: [
          {
            $projects: {
              userName: 1,
              "avatar.url": 1,
            },
          },
        ],
      },
    },
    { $unwind: "$ownerDetails" }
  );
  const videoAggregate = Video.aggregate(pipeline);
  const options = [
    {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    },
  ];

  const video = await Video.aggregatePaginate(videoAggregate, options);

  return res
    .status(200)
    .json(new apiResponse(200, video, "videos fetched sucessfully"));
});

//GETTING A VIDEO BY ID
const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: get video by id
  if (!isValidObjectId(videoId)) {
    throw new apiError(400, "Invalid video id");
  }

  if (!isValidObjectId(req.user?._id)) {
    throw new apiError(400, "Invalid user Id");
  }
  const video = Video.aggregate([
    {
      $match: {
        _id: videoId,
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "",
        foreignField: "",
        as: "likes",
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $lookup: {
              from: "subscriptions",
              localField: "_id",
              foreignField: "channel",
              as: "subscribers",
            },
          },
          {
            $addFields: {
              subscribersCount: {
                $size: "$subscribers",
              },
              isSubscribed: {
                $cond: {
                  if: {
                    $in: [req.user?._id, "$subscriptions.subscriber"],
                  },
                  then: true,
                  else: false,
                },
              },
            },
          },
          {
            $project: {
              userName: 1,
              "avatar.url": 1,
              subscribersCount: 1,
              isSubscribed: 1,
            },
          },
        ],
      },
    },

    {
      $addFields: {
        likesCount: {
          $size: "$likes",
        },
        owner: {
          $first: "$owner",
        },
        isLiked: {
          $cond: {
            if: { $in: [req.user?._id, "$likes.likedBy"] },
            then: true,
            else: false,
          },
        },
      },
    },

    {
      $project: {
        "videoFile.url": 1,
        title: 1,
        description: 1,
        views: 1,
        createdAt: 1,
        duration: 1,
        comments: 1,
        owner: 1,
        likesCount: 1,
        isLiked: 1,
      },
    },
  ]);

  if (!video) {
    throw new ApiError(500, "failed to fetch video");
  }

  // incrementing views if video fetched successfully
  await Video.findByIdAndUpdate(videoId, {
    $inc: {
      views: 1,
    },
  });

  // adding this video to user watch history
  await User.findByIdAndUpdate(req.user?._id, {
    $addToSet: {
      watchHistory: videoId,
    },
  });

  return res
    .status(200)
    .json(new ApiResponse(200, video[0], "video details fetched successfully"));
});

// UPDATE VIDEO DETAILS

const updateVideo = asyncHandler(async (req, res) => {
  //UPDATING TITLE AND DESCRIPTION OF THE VIDEO
  const { videoId } = req.params;
  const { title, description } = req.body;

  if (!title || !description) {
    throw new apiError(400, "title and description are required");
  }
  if (!isValidObjectId(videoId)) {
    throw new apiError(400, "Invalid user");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new apiError(404, "no video found");
  }
  if (video?.owner !== req.user?._id) {
    throw new apiError(400, "you are not allowed to edit this video");
  }

  //TO UPDATE THE THUMBNAIL
  //old thumbnail
  const thumbnailToDelete = await Video.thumbnail.public_id;
  //localpath of thumbnail being updated
  const thumbnailLocalPath = req.files?.path;

  if (!thumbnailLocalPath) {
    throw new apiError(400, "thumbnail is required");
  }
  const thumbnail = await fileUploadOnCloudinary(thumbnailLocalPath);

  if (!thumbnail) {
    throw new apiError("400", "error occured while uploading on cloudinary");
  }
  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        public_id: thumbnail.public_id,
        url: thumbnail.url,
      },
    },
    { new: true }
  );
  if (!updatedVideo) {
    throw new apiError(500, "video updation failed. Try again!");
  }
  if (updatedVideo) {
    await filedeleteFromCloudinary(thumbnailToDelete);
  }

  return res
    .status(200)
    .json(new apiResponse(200), "video details updation sucessful");
});
//DELETE THE VIDEO

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new apiError(400, "invalid video id");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new apiError(400, " video not found");
  }
  if (video?.owner.toString() !== req.user?._id.toString()) {
    throw new apiError(
      400,
      "invalid owner .you cannot perform the deletion operation"
    );
  }
  const videoDeleted = await Video.findByIdAndDelete(videoId);
  if (!videoDeleted) {
    throw new apiError(400, "video deletion failed");
  }
  await filedeleteFromCloudinary(video.thumbnail.public_id);
  await filedeleteFromCloudinary(video.videoFile.public_id);

  await Like.deleteMany({ video: videoId });
  await Comment.deleteMany({ video: videoId });

  return res
    .status(200)
    .json(new apiResponse(200, {}, "video deleted sucessfully"));
});
// CODE TO TOGGLE PUBLISH STATUS
const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new apiError(400, "invalidid");
  }
  const video = await Video.findById(videoId);

  if (!video) {
    throw new apiError(404, "video not found");
  }

  if (video.owner.toString() !== req.user?._id.toStrin()) {
    throw new apiError(400, "you are not owner of this video");
  }
  const toggledVideo = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        isPublished: !video?.isPublished,
      },
    },
    { new: true }
  );

  if (!toggledVideo) {
    throw new apiError(500, "Failed to toggle video publish status");
  }

  return res
    .status(200)
    .json(
      new apiResponse(
        200,
        { isPublished: toggledVideo.isPublished },
        "video publish status toggled sucessfully"
      )
    );
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
