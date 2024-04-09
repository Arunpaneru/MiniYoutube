import { mongoose, Schema } from "mongoose";
import { User } from "./user.model";

const subscriptionSchema  = new Schema(
    {
        //subscriber is the one who subscribes

        subscriber:{
            type:Schema.Types.ObjectId,
            ref:"User"
        },
        //channels are the user that are being subscribed by subscriber

        channels:{
            type:Schema.Types.ObjectId,
            ref: "User"
        }
    },
    {timestamps:true}
)

export const subscription = mongoose.model("subscriptionSchema",subscriptionSchema);