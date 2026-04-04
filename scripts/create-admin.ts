import { LocalAuthService } from "../server/services/localAuthService";
import { getDb } from "../server/db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function main() {
  const authService = new LocalAuthService();
  const usersToCreate = [
    { email: "admin@example.com", password: "password123", name: "Admin Demo" },
    { email: "admin@admin.com", password: "adminpassword123", name: "System Admin" }
  ];

  for (const user of usersToCreate) {
    console.log(`Creating user: ${user.email}...`);
    const result = await authService.register(user.email, user.password, user.name);
    
    if (result.success || result.message === "Email already registered") {
      const db = await getDb();
      if (db) {
        console.log(`Setting role 'admin' for ${user.email}...`);
        await db.update(users)
          .set({ role: 'admin' })
          .where(eq(users.email, user.email));
        
        if (result.message === "Email already registered") {
          // If already registered, we need to reset the password to be sure it matches our expectations
          await authService.resetPassword(user.email, user.password);
        }
      }
    } else {
      console.error(`Failed to create ${user.email}:`, result.message);
    }
  }
  
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
