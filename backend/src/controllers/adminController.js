import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma.js';

/**
 * Super Admin Controller
 * Provides system administration, user management, audit trails, and login activity metrics
 */

/**
 * High-level system metrics & stats
 * GET /api/admin/stats
 */
export async function getAdminStats(req, res) {
  try {
    const roleCounts = await prisma.user.groupBy({
      by: ['role'],
      _count: { id: true },
    });

    let totalUsers = 0;
    let studentCount = 0;
    let facultyCount = 0;
    let adminCount = 0;

    for (const r of roleCounts) {
      totalUsers += r._count.id;
      if (r.role === 'STUDENT') studentCount = r._count.id;
      else if (r.role === 'FACULTY') facultyCount = r._count.id;
      else if (r.role === 'ADMIN') adminCount = r._count.id;
    }

    const totalExams = await prisma.exam.count().catch(() => 0);
    const totalAttempts = await prisma.examAttempt.count().catch(() => 0);
    const totalLogins = await prisma.loginLog.count().catch(() => 0);
    const totalAuditLogs = await prisma.auditLog.count().catch(() => 0);

    return res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        breakdown: {
          students: studentCount,
          faculty: facultyCount,
          admins: adminCount,
        },
        totalExams,
        totalAttempts,
        totalLogins,
        totalAuditLogs,
      },
    });
  } catch (error) {
    console.error('[adminController.getAdminStats] Error:', error);
    return res.status(500).json({ error: 'Failed to fetch admin stats', details: error.message });
  }
}

/**
 * List all users with login history & activity counts
 * GET /api/admin/users
 */
export async function getUsers(req, res) {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        walletAddress: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            attempts: true,
            createdExams: true,
            loginLogs: true,
          },
        },
        loginLogs: {
          take: 1,
          orderBy: { loginAt: 'desc' },
          select: {
            loginAt: true,
            ipAddress: true,
            userAgent: true,
          },
        },
      },
    });

    const enrichedUsers = users.map((u) => ({
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      role: u.role,
      walletAddress: u.walletAddress,
      createdAt: u.createdAt,
      attemptCount: u._count.attempts,
      createdExamCount: u._count.createdExams,
      totalLogins: u._count.loginLogs,
      lastLogin: u.loginLogs[0] || null,
    }));

    return res.status(200).json({
      success: true,
      users: enrichedUsers,
    });
  } catch (error) {
    console.error('[adminController.getUsers] Error:', error);
    return res.status(500).json({ error: 'Failed to retrieve users', details: error.message });
  }
}

/**
 * Update a user's role (STUDENT, FACULTY, ADMIN)
 * PATCH /api/admin/users/:id/role
 */
export async function updateUserRole(req, res) {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const allowedRoles = ['STUDENT', 'FACULTY', 'ADMIN'];
    if (!role || !allowedRoles.includes(role.toUpperCase())) {
      return res.status(400).json({
        error: `Invalid role specified. Allowed values are: ${allowedRoles.join(', ')}`,
      });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const newRole = role.toUpperCase();
    const oldRole = targetUser.role;

    if (oldRole === newRole) {
      return res.status(200).json({
        success: true,
        message: `User is already assigned to role ${newRole}`,
        user: targetUser,
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { role: newRole },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        walletAddress: true,
        updatedAt: true,
      },
    });

    const ipAddress = (req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || req.ip || '127.0.0.1').toString().trim();

    // Log the privilege escalation/change in the Audit Log
    await prisma.auditLog.create({
      data: {
        action: 'USER_ROLE_CHANGED',
        details: JSON.stringify({
          targetUserId: id,
          targetEmail: targetUser.email,
          previousRole: oldRole,
          assignedRole: newRole,
          modifiedByAdmin: req.user.email,
        }),
        userId: req.user.id,
        ipAddress,
      },
    }).catch((err) => console.error('[AuditLog role update error]:', err.message));

    return res.status(200).json({
      success: true,
      message: `Role for ${updatedUser.fullName} updated from ${oldRole} to ${newRole}`,
      user: updatedUser,
    });
  } catch (error) {
    console.error('[adminController.updateUserRole] Error:', error);
    return res.status(500).json({ error: 'Failed to update user role', details: error.message });
  }
}

/**
 * Super Admin creation of any user account
 * POST /api/admin/users
 */
export async function createUser(req, res) {
  try {
    const { email, password, fullName, walletAddress, role } = req.body;

    if (!email || !password || !fullName || !walletAddress) {
      return res.status(400).json({
        error: 'Missing required fields: email, password, fullName, walletAddress',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!ethAddressRegex.test(walletAddress)) {
      return res.status(400).json({
        error: 'Invalid Ethereum wallet address format (must be 0x followed by 40 hex chars)',
      });
    }

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
        return res.status(409).json({ error: 'A user with this email already exists' });
      }
      return res.status(409).json({ error: 'A user with this wallet address already exists' });
    }

    const assignedRole = role && ['FACULTY', 'ADMIN', 'STUDENT'].includes(role.toUpperCase())
      ? role.toUpperCase()
      : 'STUDENT';

    const hashedPassword = await bcrypt.hash(password, 10);

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

    await prisma.auditLog.create({
      data: {
        action: 'ADMIN_CREATED_USER',
        details: JSON.stringify({
          createdUserId: user.id,
          createdEmail: user.email,
          role: user.role,
          createdBy: req.user.email,
        }),
        userId: req.user.id,
        ipAddress,
      },
    }).catch((err) => console.error('[AuditLog create user error]:', err.message));

    return res.status(201).json({
      success: true,
      message: `User ${user.fullName} created successfully with role ${user.role}`,
      user,
    });
  } catch (error) {
    console.error('[adminController.createUser] Error:', error);
    return res.status(500).json({ error: 'Failed to create user', details: error.message });
  }
}

/**
 * Delete a user
 * DELETE /api/admin/users/:id
 */
export async function deleteUser(req, res) {
  try {
    const { id } = req.params;

    if (id === req.user.id) {
      return res.status(400).json({ error: 'You cannot delete your own Super Admin account' });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    await prisma.user.delete({
      where: { id },
    });

    const ipAddress = (req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || req.ip || '127.0.0.1').toString().trim();

    await prisma.auditLog.create({
      data: {
        action: 'USER_DELETED',
        details: JSON.stringify({
          deletedUserId: id,
          deletedEmail: targetUser.email,
          deletedRole: targetUser.role,
          deletedBy: req.user.email,
        }),
        userId: req.user.id,
        ipAddress,
      },
    }).catch((err) => console.error('[AuditLog delete user error]:', err.message));

    return res.status(200).json({
      success: true,
      message: `User ${targetUser.email} has been deleted successfully`,
    });
  } catch (error) {
    console.error('[adminController.deleteUser] Error:', error);
    return res.status(500).json({
      error: 'Failed to delete user. The user may have active exams or attempts linked.',
      details: error.message,
    });
  }
}

/**
 * Retrieve login logs ("when user have logged in")
 * GET /api/admin/login-logs
 */
export async function getLoginLogs(req, res) {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);

    const logs = await prisma.loginLog.findMany({
      take: limit,
      orderBy: { loginAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            role: true,
            walletAddress: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      count: logs.length,
      logs: logs.map((log) => ({
        id: log.id,
        userId: log.userId,
        user: log.user,
        ipAddress: log.ipAddress || '127.0.0.1',
        userAgent: log.userAgent || 'Unknown Device',
        loginAt: log.loginAt,
      })),
    });
  } catch (error) {
    console.error('[adminController.getLoginLogs] Error:', error);
    return res.status(500).json({ error: 'Failed to retrieve login activity logs', details: error.message });
  }
}

/**
 * Retrieve security & system audit logs
 * GET /api/admin/audit-logs
 */
export async function getAuditLogs(req, res) {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);

    const logs = await prisma.auditLog.findMany({
      take: limit,
      orderBy: { timestamp: 'desc' },
    });

    // Optionally attach user info for userIds
    const userIds = [...new Set(logs.map((l) => l.userId).filter(Boolean))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true, fullName: true, role: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    const enrichedLogs = logs.map((log) => {
      let parsedDetails = null;
      if (log.details) {
        try {
          parsedDetails = JSON.parse(log.details);
        } catch {
          parsedDetails = log.details;
        }
      }

      return {
        id: log.id,
        action: log.action,
        details: parsedDetails,
        userId: log.userId,
        user: log.userId ? userMap.get(log.userId) || null : null,
        ipAddress: log.ipAddress || '127.0.0.1',
        timestamp: log.timestamp,
      };
    });

    return res.status(200).json({
      success: true,
      count: enrichedLogs.length,
      logs: enrichedLogs,
    });
  } catch (error) {
    console.error('[adminController.getAuditLogs] Error:', error);
    return res.status(500).json({ error: 'Failed to retrieve audit trail logs', details: error.message });
  }
}
