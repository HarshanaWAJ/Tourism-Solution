import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ["tourist", "vendor", "driver", "admin"],
      default: "tourist",
      index: true,
    },
    phone: { type: String },
    preferredLanguage: { type: String, default: "en" },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

userSchema.methods.setPassword = async function (plain) {
  this.passwordHash = await bcrypt.hash(plain, 10);
};

userSchema.methods.checkPassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

userSchema.methods.toSafeJSON = function () {
  const { _id, name, email, role, phone, preferredLanguage, createdAt } = this;
  return { id: _id, name, email, role, phone, preferredLanguage, createdAt };
};

export default mongoose.model("User", userSchema);
