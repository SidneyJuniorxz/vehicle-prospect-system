import bcrypt from "bcrypt";
import { getDb, upsertUser, getUserByOpenId } from "../db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export interface LocalUser {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  user?: {
    id: number;
    email: string;
    name: string;
    role: string;
  };
}

const SALT_ROUNDS = 10;

/**
 * Local authentication service for self-hosted deployments
 */
export class LocalAuthService {
  /**
   * Hash password using bcrypt
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  /**
   * Verify password against hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Register new local user
   */
  async register(email: string, password: string, name: string): Promise<AuthResponse> {
    const db = await getDb();
    if (!db) {
      return { success: false, message: "Database not available" };
    }

    // Validate input
    if (!email || !password || !name) {
      return { success: false, message: "Email, password, and name are required" };
    }

    if (password.length < 6) {
      return { success: false, message: "Password must be at least 6 characters" };
    }

    if (!this.isValidEmail(email)) {
      return { success: false, message: "Invalid email format" };
    }

    try {
      // Check if user already exists
      const existing = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existing.length > 0) {
        return { success: false, message: "Email already registered" };
      }

      // Hash password
      const passwordHash = await this.hashPassword(password);

      // Create user with email as openId for local auth
      const openId = `local_${email}`;
      const result = await db.insert(users).values({
        openId,
        email,
        name,
        loginMethod: "local",
        role: "analyst", // Default role for new users
        lastSignedIn: new Date(),
      });

      // Get the created user
      const newUser = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (newUser.length === 0) {
        return { success: false, message: "Failed to create user" };
      }

      const user = newUser[0];

      // Store password hash in a separate field (in production, use a dedicated table)
      // For now, we'll use a workaround by storing it in the database
      await this.storePasswordHash(email, passwordHash);

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email || "",
          name: user.name || "",
          role: user.role,
        },
      };
    } catch (error) {
      console.error("Registration error:", error);
      return { success: false, message: "Registration failed" };
    }
  }

  /**
   * Login with email and password
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    const db = await getDb();
    if (!db) {
      return { success: false, message: "Database not available" };
    }

    if (!email || !password) {
      return { success: false, message: "Email and password are required" };
    }

    try {
      // Find user by email
      const userResult = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (userResult.length === 0) {
        return { success: false, message: "Invalid email or password" };
      }

      const user = userResult[0];

      // Get stored password hash
      const storedHash = await this.getPasswordHash(email);
      if (!storedHash) {
        return { success: false, message: "Invalid email or password" };
      }

      // Verify password
      const isValid = await this.verifyPassword(password, storedHash);
      if (!isValid) {
        return { success: false, message: "Invalid email or password" };
      }

      // Update last signed in
      await db
        .update(users)
        .set({ lastSignedIn: new Date() })
        .where(eq(users.id, user.id));

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email || "",
          name: user.name || "",
          role: user.role,
        },
      };
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, message: "Login failed" };
    }
  }

  /**
   * Change password
   */
  async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string
  ): Promise<AuthResponse> {
    const db = await getDb();
    if (!db) {
      return { success: false, message: "Database not available" };
    }

    if (!currentPassword || !newPassword) {
      return { success: false, message: "Current and new passwords are required" };
    }

    if (newPassword.length < 6) {
      return { success: false, message: "New password must be at least 6 characters" };
    }

    try {
      // Get user
      const userResult = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (userResult.length === 0) {
        return { success: false, message: "User not found" };
      }

      const user = userResult[0];
      if (!user.email) {
        return { success: false, message: "User email not found" };
      }

      // Verify current password
      const storedHash = await this.getPasswordHash(user.email);
      if (!storedHash) {
        return { success: false, message: "Password verification failed" };
      }

      const isValid = await this.verifyPassword(currentPassword, storedHash);
      if (!isValid) {
        return { success: false, message: "Current password is incorrect" };
      }

      // Hash new password
      const newHash = await this.hashPassword(newPassword);

      // Store new password hash
      await this.storePasswordHash(user.email, newHash);

      return { success: true, message: "Password changed successfully" };
    } catch (error) {
      console.error("Change password error:", error);
      return { success: false, message: "Failed to change password" };
    }
  }

  /**
   * Reset password (admin or email verification)
   */
  async resetPassword(email: string, newPassword: string): Promise<AuthResponse> {
    const db = await getDb();
    if (!db) {
      return { success: false, message: "Database not available" };
    }

    if (!email || !newPassword) {
      return { success: false, message: "Email and new password are required" };
    }

    if (newPassword.length < 6) {
      return { success: false, message: "Password must be at least 6 characters" };
    }

    try {
      // Find user
      const userResult = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (userResult.length === 0) {
        return { success: false, message: "User not found" };
      }

      // Hash new password
      const newHash = await this.hashPassword(newPassword);

      // Store new password hash
      await this.storePasswordHash(email, newHash);

      return { success: true, message: "Password reset successfully" };
    } catch (error) {
      console.error("Reset password error:", error);
      return { success: false, message: "Failed to reset password" };
    }
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Store password hash (in production, use a dedicated table)
   * For now, we'll use a simple in-memory store with file persistence
   */
  private async storePasswordHash(email: string, hash: string): Promise<void> {
    // In production, create a password_hashes table
    // For MVP, we'll store in a JSON file
    const fs = await import("fs").then((m) => m.promises);
    const path = await import("path");

    const hashFile = path.join(process.cwd(), ".password_hashes.json");

    try {
      let hashes: Record<string, string> = {};

      // Read existing hashes
      try {
        const content = await fs.readFile(hashFile, "utf-8");
        hashes = JSON.parse(content);
      } catch {
        // File doesn't exist yet
      }

      // Update hash
      hashes[email] = hash;

      // Write back
      await fs.writeFile(hashFile, JSON.stringify(hashes, null, 2), "utf-8");
    } catch (error) {
      console.error("Failed to store password hash:", error);
    }
  }

  /**
   * Get password hash
   */
  private async getPasswordHash(email: string): Promise<string | null> {
    const fs = await import("fs").then((m) => m.promises);
    const path = await import("path");

    const hashFile = path.join(process.cwd(), ".password_hashes.json");

    try {
      const content = await fs.readFile(hashFile, "utf-8");
      const hashes = JSON.parse(content);
      return hashes[email] || null;
    } catch {
      return null;
    }
  }
}

// Singleton instance
let authServiceInstance: LocalAuthService | null = null;

export function getLocalAuthService(): LocalAuthService {
  if (!authServiceInstance) {
    authServiceInstance = new LocalAuthService();
  }
  return authServiceInstance;
}
