const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      select: false
    },
    phone: {
      type: String,
      trim: true,
      default: ''
    },
    role: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Role',
      required: [true, 'User role is required']
    },
    department: {
      type: String,
      default: 'Sales',
      trim: true
    },
    reportingManager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    avatar: {
      type: String,
      default: ''
    },
    isActive: {
      type: Boolean,
      default: true
    },
    lastLogin: {
      type: Date,
      default: null
    },
    passwordResetToken: String,
    passwordResetExpires: Date
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Compound index to ensure unique email per organization
userSchema.index({ organizationId: 1, email: 1 }, { unique: true });

// Full name virtual
userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`.trim();
});

// Hash password before saving
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
