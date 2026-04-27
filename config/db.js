import mongoose from "mongoose";
export const connectDb = async () => {
  await mongoose
    .connect(
      "mongodb+srv://dbuser2:dbuser1234@cluster0.nkietmc.mongodb.net/MediCare",
    )
    .then(() => console.log("db connected"))
    .catch((err) => console.log(err));
};
