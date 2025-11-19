const { User } = require("../models");
const { hashPassword, comparePassword } = require("../helpers/bcrypt");
const { signToken } = require("../helpers/jwt");
const { Op } = require("sequelize");

exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Check if email exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    // Hash password
    const hashedPassword = hashPassword(password);

    // Create user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    // Generate token
    const token = signToken({ id: user.id, email: user.email });

    res.status(201).json({
      access_token: token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        photoUrl: user.photoUrl,
        isOnline: false,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};
