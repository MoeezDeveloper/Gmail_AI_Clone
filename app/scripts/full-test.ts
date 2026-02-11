import { prisma } from "../src/lib/prisma";

async function runTests() {
  console.log("🧪 Running Full Project Tests\n");
  console.log("=".repeat(50));

  // Test 1: Database Connection
  console.log("\n📊 Test 1: Database Connection");
  try {
    await prisma.$connect();
    console.log("   ✅ Database connected successfully");
  } catch (e) {
    console.log("   ❌ Database connection failed:", e);
    return;
  }

  // Test 2: Check Users
  console.log("\n👤 Test 2: Users Table");
  const users = await prisma.user.findMany();
  console.log(`   Found ${users.length} users`);
  users.forEach((u) => console.log(`   - ${u.email} (${u.name || "No name"})`));

  // Test 3: Check Accounts
  console.log("\n🔑 Test 3: Accounts Table");
  const accounts = await prisma.account.findMany();
  console.log(`   Found ${accounts.length} accounts`);
  accounts.forEach((a) => console.log(`   - ${a.emailAddress} (${a.provider})`));

  // Test 4: Check Threads
  console.log("\n📧 Test 4: Threads Table");
  const threads = await prisma.thread.findMany({
    include: { emails: true },
  });
  console.log(`   Found ${threads.length} threads`);
  if (threads.length === 0) {
    console.log("   ⚠️  No threads found - will seed test data");
  } else {
    threads.forEach((t) =>
      console.log(`   - ${t.subject} (${t.folder}, ${t.emails.length} emails)`)
    );
  }

  // Test 5: Check Emails
  console.log("\n✉️  Test 5: Emails Table");
  const emails = await prisma.email.findMany();
  console.log(`   Found ${emails.length} emails`);

  // Test 6: Seed Data if empty
  if (threads.length === 0) {
    console.log("\n🌱 Test 6: Seeding Test Data");
    
    let user = await prisma.user.findFirst();
    if (!user) {
      user = await prisma.user.create({
        data: { email: "test@example.com", name: "Test User" },
      });
      console.log("   Created test user");
    }

    const testEmails = [
      { subject: "Welcome to AI Mail", from: "team@aimail.com", body: "Welcome! This is your first email.", folder: "INBOX" },
      { subject: "Your Weekly Report", from: "reports@company.com", body: "Here is your weekly report.", folder: "INBOX" },
      { subject: "Meeting Tomorrow", from: "calendar@company.com", body: "Meeting scheduled for tomorrow.", folder: "INBOX" },
      { subject: "Invoice #12345", from: "billing@service.com", body: "Your invoice is ready.", folder: "INBOX" },
      { subject: "Order Shipped", from: "shop@store.com", body: "Your order has shipped.", folder: "SENT" },
    ];

    for (const email of testEmails) {
      await prisma.thread.create({
        data: {
          subject: email.subject,
          snippet: email.body,
          folder: email.folder as "INBOX" | "SENT" | "DRAFTS" | "TRASH",
          lastMessageAt: new Date(),
          userId: user.id,
          emails: {
            create: {
              from: email.from,
              to: user.email,
              subject: email.subject,
              body: email.body,
              isRead: false,
              sentAt: new Date(),
              userId: user.id,
            },
          },
        },
      });
      console.log(`   ✅ Created: ${email.subject}`);
    }
  }

  // Test 7: Verify Data
  console.log("\n✅ Test 7: Final Verification");
  const finalThreads = await prisma.thread.count();
  const finalEmails = await prisma.email.count();
  console.log(`   Threads: ${finalThreads}`);
  console.log(`   Emails: ${finalEmails}`);

  // Test 8: Test API Data Format
  console.log("\n📡 Test 8: API Data Format Test");
  const apiThreads = await prisma.thread.findMany({
    where: { folder: "INBOX" },
    include: {
      emails: {
        orderBy: { sentAt: "desc" },
        take: 1,
      },
    },
    orderBy: { lastMessageAt: "desc" },
    take: 50,
  });
  console.log(`   INBOX threads: ${apiThreads.length}`);
  apiThreads.forEach((t) => {
    const email = t.emails[0];
    console.log(`   - ${t.subject}`);
    console.log(`     From: ${email?.from || "N/A"}`);
    console.log(`     Snippet: ${t.snippet.substring(0, 50)}...`);
  });

  console.log("\n" + "=".repeat(50));
  console.log("🎉 All tests completed!\n");
}

runTests()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
