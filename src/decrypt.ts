import dotenv from "dotenv";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

dotenv.config();

const algorithm = "aes-256-cbc";
const password = process.env.ENCRYPTION_PASSWORD;

if (!password) {
  console.error("Error: ENCRYPTION_PASSWORD not set in .env file");
  process.exit(1);
}

const key = crypto.scryptSync(password, "salt", 32);

const decryptMapping = async (mappingPath: string): Promise<Record<string, string>> => {
  const input = await fs.readFile(mappingPath);
  const iv = input.slice(0, 16);
  const encryptedData = input.slice(16);
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  const decrypted = Buffer.concat([
    decipher.update(encryptedData),
    decipher.final(),
  ]);
  console.log(`Mapping decrypted: ${decrypted.toString()}`);
  console.log(`Json: ${JSON.parse(decrypted.toString())}`);
  
  return JSON.parse(decrypted.toString());
  // return decrypted.toString();
};

const decryptFile = async (filePath: string, outputDir: string, originalName: string) => {
  const outputPath = path.join(outputDir, originalName);
  const input = await fs.readFile(filePath);

  const iv = input.slice(0, 16);
  const encryptedData = input.slice(16);

  const decipher = crypto.createDecipheriv(algorithm, key, iv);

  const decrypted = Buffer.concat([
    decipher.update(encryptedData),
    decipher.final(),
  ]);
  await fs.writeFile(outputPath, decrypted);
};

const decryptFolder = async (folderPath: string, outputDir: string, fileMapping: Record<string, string>) => {
  await fs.mkdir(outputDir, { recursive: true });

  const files = await fs.readdir(folderPath);

  for (const file of files) {
    if (file === "mapping.enc") continue;

    const filePath = path.join(folderPath, file);
    const stat = await fs.stat(filePath);

    if (stat.isDirectory()) {
      const originalName = fileMapping[file];
      if (!originalName) {
        console.error(`Original name not found for folder ${file}`);
        continue;
      }
      const nestedOutputDir = path.join(outputDir, originalName);
      await decryptFolder(filePath, nestedOutputDir, fileMapping);
    } else if (stat.isFile()) {
      const originalName = fileMapping[file];
      if (!originalName) {
        console.error(`Original name not found for file ${file}`);
        continue;
      }
      await decryptFile(filePath, outputDir, originalName);
      console.log(`Decrypted: ${filePath} -> ${path.join(outputDir, originalName)}`);
    }
  }
};

const folderToDecrypt = "encrypted_notes";
const decryptedFolder = "decrypted_notes";

if (!folderToDecrypt) {
  console.error("Error: Folder to decrypt is not defined");
  process.exit(1);
}

decryptMapping(path.join(folderToDecrypt, "mapping.enc"))
  .then((fileMapping) => {
    for (const key in fileMapping) {
      console.log(`${key} -> ${fileMapping[key]}`);
    }
    decryptFolder(folderToDecrypt, decryptedFolder, fileMapping);
  })
  .then(() => console.log("Decryption complete"))
  .catch((err) => console.error("Decryption failed:", err));
