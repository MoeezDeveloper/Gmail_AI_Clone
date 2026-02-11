import { prisma } from "../src/lib/prisma";
import { fetchMessages } from "../src/lib/aurinko";

async function main() {
  console.log("Testing Aurinko API...\n");
  
  // Get the latest account
  const account = await prisma.account.findFirst({
    orderBy: { createdAt: "desc" },
  });
  
  if (!account) {
    console.log("No account found!");
    return;
  }
  
  console.log("Using account:", account.emailAddress);
  console.log("Token (first 30):", account.accessToken.substring(0, 30) + "...");
  
  try {
    console.log("\nFetching messages from Aurinko...");
    const response = await fetchMessages(account.accessToken, { maxResults: 5 });
    
    console.log("\nResponse:", JSON.stringify(response, null, 2));
  } catch (error) {
    console.error("\nError fetching messages:", error);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
