import { Pinecone } from "@pinecone-database/pinecone";
import dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.PINECONE_API_KEY;

if (!apiKey) {
  throw new Error("PINECONE_API_KEY not found in .env");
}

const pc = new Pinecone({
  apiKey,
});

export const index = pc.index("smartprep-ai");