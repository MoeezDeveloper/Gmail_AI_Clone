import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("Checking database...\n");
  
  // Check accounts
  const accounts = await prisma.account.findMany({
    include: { user: true },
  });
  console.log("Accounts:", accounts.length);
  accounts.forEach((a) => {
    console.log(`  - ID: ${a.id}`);
    console.log(`    Email: ${a.emailAddress}`);
    console.log(`    User: ${a.user?.email}`);
    console.log(`    Has Token: ${!!a.accessToken}`);
    console.log(`    Token (first 20): ${a.accessToken.substring(0, 20)}...`);
  });
  
  // Check threads
  const threads = await prisma.thread.findMany({
    include: { emails: true },
    take: 10,
  });
  console.log("\nThreads:", threads.length);
  threads.forEach((t) => {
    console.log(`  - ${t.subject} (${t.emails.length} emails)`);
  });
  
  // Check emails
  const emailCount = await prisma.email.count();
  console.log("\nTotal Emails:", emailCount);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
