import mongoose, { isValidObjectId } from "mongoose";
import { Comment } from "../models/comment.model.js";
import { apiError, apiErrorpiError } from "../utils/apiError.js";
import { apiResponse, apiResponsepiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.model.js";
import { Like } from "../models/like.model.js";

const getVideoComments = asyncHandler(async (req, res) => {
  //TODO: get all comments for a video
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  if (!isValidObjectId(videoId)) {
    throw new apiError(400, "invalid video id");
  }
  const video = await Video.findById(videoId);

  if (!video) {
    throw new apiError(404, "video not found");
  }

  //   if(video.owner !== req.user?._id ){
  //     throw new apiError(400,"you are not allowed to edit this video")
  //   }

  const commentAggregate = Comment.aggregate([
    {
      $match: {
        video: videoId,
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "comment",
        as: "likes",
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
      $sort: {
        createdAt: -1,
      },
    },
    {
      $project: {
        content: 1,
        createdAt: 1,
        likesCount: 1,
        owner: {
          username: 1,
          fullName: 1,
          "avatar.url": 1,
        },
        isLiked: 1,
      },
    },
  ]);

  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  };
  const comments = await Comment.aggregatePaginate(commentAggregate, options);
  return res
    .status(200)
    .json(new apiResponse(200, comments, "comments get fetched sucessfully"));
});

const addComment = asyncHandler(async (req, res) => {
  // TODO: add a comment to a video
  const {content} = req.body;
  const {videoId} = req.params;

  if (!isValidObjectId(videoId)) {
    throw new apiError(400, "invalid video id");
  }
  if (!content) {
    throw new apiError(400, "comment content is required");
  }
  const video = await Video.findById(videoId);

  if (!video) {
    throw new apiError(404, "video not found");
  }

  const comment = Comment.create({
    content,
    video: videoId,
    owner: req.user?._id,
  });

  if (!comment) {
    throw new apiError(500, "Failed to add comment");
  }

  return res
    .status(201)
    .json(new apiResponse(201, comment, "comment added sucessfully"));
});

const updateComment = asyncHandler(async (req, res) => {
  // TODO: update a comment
  const {content} = req.body;
  const {commentId} = req.params;
  if (!isValidObjectId(commentId)) {
    throw new apiError(400, "invalid comment id");
  }
  if (!content) {
    throw new apiError(400, "comment content is required");
  }
  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new apiError(404, "comment not found");
  }
  if (comment?._owner.toString() !== req.user?._id.toString()) {
    throw new apiError(400, "you are not comment owner");
  }

  const updatedComment = await Comment.findByIdAndUpdate(
    comment?._id,
    {
      $set: {
        content,
      },
    },
    { new: true }
  );

  if (!updatedComment) {
    throw new apiError(500, "Failed to edit comment");
  }

  return res
    .status(200)
    .json(new apiResponse(200, updatedComment, "Comment edited sucessfully"));
});

const deleteComment = asyncHandler(async (req, res) => {
  // TODO: delete a comment
  const {commentId} = req.params
  
  const comment=await Comment.findById(commentId);

  if(!comment){
    throw new apiError(404, "comment not found");
  }
  if (comment?._owner.toString() !== req.user?._id.toString()) {
    throw new apiError(400, "you are not comment owner");
  }

  await Comment.findByIdAndDelete(comment?._id);

  await Like.deleteMany({
    comment:commentId,
    likedBy:req.user?._id
  })
  return res
  .status(200)
  .json(
      new apiResponse(200, { commentId }, "Comment deleted successfully")
  );

});

export { getVideoComments, addComment, updateComment, deleteComment };
