import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";

const users = [
  { name: "Alice", email: "alice@example.com", role: "user" as const, balance: 1000 },
  { name: "Bob", email: "bob@example.com", role: "user" as const, balance: 1000 },
  { name: "Charlie", email: "charlie@example.com", role: "user" as const, balance: 1000 },
  { name: "Admin", email: "admin@example.com", role: "admin" as const, balance: 0 },
];

const SHARED_PASSWORD = "password123";

export async function seedDatabase() {
  await dbConnect();

  const hashedPassword = await bcrypt.hash(SHARED_PASSWORD, 10);
  const results: string[] = [];

  for (const user of users) {
    const existing = await User.findOne({ email: user.email });
    if (!existing) {
      await User.create({ ...user, password: hashedPassword });
      results.push(`Created ${user.name} (${user.email})`);
    } else {
      results.push(`${user.name} (${user.email}) already exists`);
    }
  }

  return results;
}
