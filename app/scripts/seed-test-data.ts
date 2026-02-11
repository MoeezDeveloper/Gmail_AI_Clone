import { prisma } from "../src/lib/prisma";

async function seedTestData() {
  // First, get or create a user
  let user = await prisma.user.findFirst();
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: "test@example.com",
        name: "Test User",
      },
    });
  }
  console.log("User:", user.email);

  // Create test threads with emails
  const testEmails = [
    {
      subject: "Welcome to AI Mail",
      from: "team@aimail.com",
      body: "Welcome to AI Mail! This is your first real email from the database. We're excited to have you here!",
      folder: "INBOX" as const,
    },
    {
      subject: "Your Weekly Report",
      from: "reports@company.com",
      body: "Here is your weekly productivity report. You have accomplished great things this week! Keep up the excellent work.",
      folder: "INBOX" as const,
    },
    {
      subject: "Meeting Tomorrow at 10 AM",
      from: "calendar@company.com",
      body: "Reminder: You have a team meeting scheduled for tomorrow at 10:00 AM. Please prepare your updates.",
      folder: "INBOX" as const,
    },
    {
      subject: "Invoice #12345",
      from: "billing@service.com",
      body: "Your monthly invoice is ready. Amount due: $99.00. Due date: Feb 15, 2026. Thank you for your business!",
      folder: "INBOX" as const,
    },
    {
      subject: "Thanks for your purchase!",
      from: "noreply@shop.com",
      body: "Thank you for shopping with us. Your order has been shipped and will arrive in 2-3 days. Track your package online.",
      folder: "SENT" as const,
    },
  ];

  for (const email of testEmails) {
    const thread = await prisma.thread.create({
      data: {
        subject: email.subject,
        snippet: email.body.substring(0, 100),
        folder: email.folder,
        lastMessageAt: new Date(),
        userId: user.id,
        emails: {
          create: {
            from: email.from,
            to: user.email || "test@example.com",
            subject: email.subject,
            body: email.body,
            isRead: false,
            sentAt: new Date(),
            userId: user.id,
          },
        },
      },
    });
    console.log("Created thread:", thread.subject);
  }

  console.log("Done! Created", testEmails.length, "test emails");
}

seedTestData()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
