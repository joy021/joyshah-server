const express = require("express");
const router = express.Router();
const User = require("../models/user-model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const validateToken = require("../middlewares/validate-token");

// user registration
router.post("/register", async (req, res) => {
  try {
    const userExists = await User.findOne({ email: req.body.email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(req.body.password, salt);
    req.body.password = hashedPassword;

    await User.create(req.body);

    return res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// user login
// router.post("/login", async (req, res) => {
//   try {
//     //check if user exists?
//     const user = await User.findOne({ email: req.body.email });
//     if (!user) {
//       return res.status(400).json({ message: "User not found" });
//     }

//     // check if password is correct (because in the database password will be encrypted.)
//     //from the front end you will get plain password.
//     // bcrypt.compare method plain and encrypted password
//     // both password same or not same hase toh login successfull thai jase

//     const validPassword = await bcrypt.compare(
//       req.body.password,
//       user.password
//     );
//     if (!validPassword) {
//       return res.status(400).json({ message: "Invalid password" });
//     }

//     //create and assign a token (encrypted information of user id)
//     //authorized request malse toh token ne decrypt karisu
//     //token valid hase toj front end ne response mokli su
//     // sign is use for encrypt
//     // user nu ID encrypt karisu
//     //encrption and decryption maate ek j key hovi joie
//     // (.env ma key etle mukvani chhe)

//     //create and assign a token
//     const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET_KEY); // ENCRYPT KARAVU HOY TOH SIGN METHOD NO USE THAAY CHHE

//     // to returning the token
//     return res.status(200).json({ token, message: "Login successfull" });
//   } catch (error) {
//     return res.status(500).json({ message: error.message });
//   }
// });

router.post("/login", async (req, res) => {
  try {
    // Check if user exists
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    // Check if user is active
    if (!user.isActive ) {      
      return res.status(403).json({ message: "Your account is deactivated. 📞 Contact support: +91 9173933076" });
    }

    // Check if password is correct
    const validPassword = await bcrypt.compare(
      req.body.password,
      user.password
    );
    if (!validPassword) {
      return res.status(400).json({ message: "Invalid password" });
    }

    // Create and assign a token
    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET_KEY);

    return res.status(200).json({ token, message: "Login successful" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});


//get current user
router.get("/current-user", validateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    return res
      .status(200)
      .json({ data: user, message: "User fetched successfully" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// get all users
router.get("/get-all-users", validateToken, async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    return res
      .status(200)
      .json({ data: users, message: "Users fetched successfully" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// update user
router.put("/update-user", validateToken, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.body.userId, req.body);
    return res.status(200).json({ message: "User updated successfully" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// Admin - Block User
router.put("/block-user/:id", validateToken, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isBlocked: true }, { new: true });
    return res.json({ success: true, message: "User blocked successfully", user });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error blocking user" });
  }
});

// Admin - Unblock User
router.put("/unblock-user/:id", validateToken, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isBlocked: false }, { new: true });
    return res.json({ success: true, message: "User unblocked successfully", user });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error unblocking user" });
  }
});

// update-profile
router.put("/update-profile", validateToken, async (req, res) => {
  try {
    const { name, email, oldPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (newPassword) {
      const isMatch = await bcrypt.compare(oldPassword, user.password);
      if (!isMatch) return res.status(400).json({ message: "Old password is incorrect" });
      user.password = await bcrypt.hash(newPassword, 10);
    }

    if (name) user.name = name;
    if (email) user.email = email;
    await user.save();

    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET_KEY);
    return res.status(200).json({
      message: "Profile updated successfully",
      user: { name: user.name, email: user.email },
      token,
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
});

module.exports = router;