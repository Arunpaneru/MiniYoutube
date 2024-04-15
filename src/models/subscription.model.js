import mongoose,{  Schema } from "mongoose"; 

const subscriptionSchema  = new Schema(
    {
        //subscriber is the one who subscribes

        subscriber:{
            type:Schema.Types.ObjectId,
            ref:"User"
        },
        //channels are the user that are being subscribed by subscriber

        channel:{
            type:Schema.Types.ObjectId,
            ref: "User"
        }
    },
    {timestamps:true}
)

export const Subscription = mongoose.model("Subscription",subscriptionSchema)