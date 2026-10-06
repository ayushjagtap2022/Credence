import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import prisma from '../lib/prisma.js';

export async function register(req, res) {
  try {
    let { email, password, fullName, walletAddress, role } = req.body;

    if (!email || !password || !fullName) {
      return res.status(400).json({
        error: 'Missing required fields: email, password, fullName',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: 'Password must be at least 6 characters long',
      });
    }

    // Auto-generate Ethereum wallet address if not provided by user
    if (!walletAddress || !walletAddress.trim()) {
      walletAddress = '0x' + crypto.randomBytes(20).toString('hex');
    }

    // Validate Ethereum wallet format (0x followed by 40 hex characters)
    const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!ethAddressRegex.test(walletAddress)) {
      return res.status(400).json({
        error: 'Invalid Ethereum wallet address format (must be 0x followed by 40 hex characters)',
      });
    }

    // Check if user or wallet already registered
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email.toLowerCase() },
          { walletAddress: walletAddress.toLowerCase() },
        ],
      },
    });

    if (existingUser) {
      if (existingUser.email.toLowerCase() === email.toLowerCase()) {
        return res.status(409).json({ error: 'User with this email already exists' });
      }
      return res.status(409).json({ error: 'Wallet address is already registered to another account' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const assignedRole = role && ['FACULTY', 'ADMIN'].includes(role.toUpperCase())
      ? role.toUpperCase()
      : 'STUDENT';

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        fullName: fullName.trim(),
        walletAddress: walletAddress.toLowerCase(),
        role: assignedRole,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        walletAddress: true,
        createdAt: true,
      },
    });

    const ipAddress = (req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || req.ip || '127.0.0.1').toString().trim();
    const userAgent = (req.headers['user-agent'] || 'Unknown Browser').toString().slice(0, 500);

    // Record initial login session and audit log
    await prisma.loginLog.create({
      data: {
        userId: user.id,
        ipAddress,
        userAgent,
      },
    }).catch((err) => console.error('[LoginLog register error]:', err.message));

    await prisma.auditLog.create({
      data: {
        action: 'USER_REGISTERED',
        details: JSON.stringify({ email: user.email, role: user.role, fullName: user.fullName }),
        userId: user.id,
        ipAddress,
      },
    }).catch((err) => console.error('[AuditLog register error]:', err.message));

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        walletAddress: user.walletAddress,
        fullName: user.fullName,
      },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN }
    );

    return res.status(201).json({
      success: true,
      message: 'Account successfully registered',
      token,
      user,
    });
  } catch (error) {
    console.error('[authController.register] Error:', error);
    return res.status(500).json({ error: 'Failed to register account', details: error.message });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const ipAddress = (req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || req.ip || '127.0.0.1').toString().trim();
    const userAgent = (req.headers['user-agent'] || 'Unknown Browser').toString().slice(0, 500);

    // Record login log session
    await prisma.loginLog.create({
      data: {
        userId: user.id,
        ipAddress,
        userAgent,
      },
    }).catch((err) => console.error('[LoginLog login error]:', err.message));

    // Record audit log
    await prisma.auditLog.create({
      data: {
        action: 'USER_LOGIN',
        details: JSON.stringify({ email: user.email, role: user.role, fullName: user.fullName }),
        userId: user.id,
        ipAddress,
      },
    }).catch((err) => console.error('[AuditLog login error]:', err.message));

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        walletAddress: user.walletAddress,
        fullName: user.fullName,
      },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN }
    );

    return res.status(200).json({
      success: true,
      message: 'Signed in successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        walletAddress: user.walletAddress,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('[authController.login] Error:', error);
    return res.status(500).json({ error: 'Failed to process login request', details: error.message });
  }
}

export async function getProfile(req, res) {
  return res.status(200).json({
    success: true,
    user: req.user,
  });
}
