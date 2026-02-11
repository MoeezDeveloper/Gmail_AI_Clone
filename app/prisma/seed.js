// Simple Prisma seed script to populate mock users, threads and emails.
// Run after configuring DATABASE_URL and installing prisma/@prisma/client:
//   npx prisma migrate dev --name init
//   npx prisma db seed

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.upsert({
    where: { email: "you@example.com" },
    update: {},
    create: {
      email: "you@example.com",
      name: "You",
    },
  });

  const threadsData = [
    {
      subject: "Welcome to AI Mail",
      snippet: "Thanks for trying this AI-powered Gmail clone...",
      folder: "INBOX",
      emails: [
        {
          from: "ai-team@example.com",
          to: user.email,
          body:
            "Hi there,\n\nThanks for trying this AI-powered Gmail clone. " +
            "This seeded data is purely for UI exploration.\n\nBest,\nAI Team",
          isRead: false,
        },
      ],
    },
    {
      subject: "Your weekly product update",
      snippet: "Here’s what shipped this week across the platform...",
      folder: "INBOX",
      emails: [
        {
          from: "product@example.com",
          to: user.email,
          body:
            "Hello,\n\nHere’s what shipped this week across the platform:\n" +
            "• Faster search\n• Better mobile layout\n• Smarter notifications\n\nCheers,\nProduct Team",
          isRead: true,
        },
      ],
    },
    {
      subject: "Draft: AI Gmail ideas",
      snippet: "Brainstorming features like smart summaries and intent search...",
      folder: "DRAFTS",
      emails: [
        {
          from: user.email,
          to: "notes@example.com",
          body:
            "Working draft:\n\n- Smart thread summaries\n- Priority inbox powered by embeddings\n- Natural language search over all mail\n\nTo be refined.",
          isRead: true,
        },
      ],
    },
  ];

  for (const thread of threadsData) {
    await prisma.thread.create({
      data: {
        subject: thread.subject,
        snippet: thread.snippet,
        folder: thread.folder,
        user: { connect: { id: user.id } },
        emails: {
          create: thread.emails.map((email) => ({
            from: email.from,
            to: email.to,
            body: email.body,
            isRead: email.isRead,
            user: { connect: { id: user.id } },
          })),
        },
      },
    });
  }

  console.log("Seeded mock email data.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

