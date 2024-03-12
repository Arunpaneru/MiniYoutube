import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"

const app = express()

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials:true 
    //allow credentials such as cookies,authorization headers
}))

app.use(express.json({
  limit:  "25kb"
}))

app.use(express.urlencoded({
  extended:true,limit:"16kb"
}))

app.use(express.static("public"))
app.use(cookieParser())

//IMPORTING ROUTES
import userRouter from './routes/user.routes.js'

//ROUTES DECLARATION
app.use("/api/v1/users",userRouter)

export {app}