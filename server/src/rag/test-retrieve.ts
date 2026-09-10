import { retrieveRelevantChunks } from "./retrieve";

async function main() {
  const question = "What is polymorphism in OOP?";

  console.log("\n🔎 QUESTION:");
  console.log(question);

  const results = await retrieveRelevantChunks(
    question,
    5
  );

  console.log("\n📚 RETRIEVED KNOWLEDGE:\n");

  results.forEach((result, i) => {
    console.log(`========== RESULT ${i + 1} ==========`);
    console.log(`Source: ${result.source}`);
    console.log(`Score: ${result.score}`);
    console.log(`\n${result.text}\n`);
  });
}

main().catch((error) => {
  console.error("\n❌ RETRIEVAL FAILED:");
  console.error(error);
  process.exit(1);
});