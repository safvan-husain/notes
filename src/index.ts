import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

dotenv.config();

const algorithm = "aes-256-cbc";
const password = process.env.ENCRYPTION_PASSWORD;

if (!password) {
  console.error("Error: ENCRYPTION_PASSWORD not set in .env file");
  process.exit(1);
}

const key = crypto.scryptSync(password, "salt", 32);

const generateFileName = (originalName: string) => {
  return crypto.createHash("sha256").update(originalName).digest("hex");
};

const encryptFile = async (filePath: string, outputDir: string, fileMapping: Record<string, string>) => {
  const fileName = path.basename(filePath);
  const newFileName = generateFileName(fileName);
  
  const outputPath = path.join(outputDir, newFileName);
  const input = await fs.readFile(filePath);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  
  const encrypted = Buffer.concat([iv, cipher.update(input), cipher.final()]);
  await fs.writeFile(outputPath, encrypted);

  fileMapping[newFileName] = fileName;
};

const encryptFolder = async (folderPath: string, outputDir: string, fileMapping: Record<string, string>) => {
  await fs.mkdir(outputDir, { recursive: true });

  const files = await fs.readdir(folderPath);

  for (const file of files) {
    const filePath = path.join(folderPath, file);
    const stat = await fs.stat(filePath);

    if (stat.isDirectory()) {
      const newFolderName = generateFileName(file);
      const nestedOutputDir = path.join(outputDir, newFolderName);
      await encryptFolder(filePath, nestedOutputDir, fileMapping);
      fileMapping[newFolderName] = file; // Add folder mapping
    } else if (stat.isFile()) {
      await encryptFile(filePath, outputDir, fileMapping);
      console.log(`Encrypted: ${filePath}`);
    }
  }
};

const encryptMapping = async (mapping: Record<string, string>, outputDir: string) => {
  const mappingJson = JSON.stringify(mapping);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  const encrypted = Buffer.concat([iv, cipher.update(mappingJson), cipher.final()]);
  await fs.writeFile(path.join(outputDir, "mapping.enc"), encrypted);
  console.log(`Mapping encrypted: ${path.join(outputDir, "mapping.enc")}`);
};

const folderToEncrypt = 'text_notes';
const encryptedFolder = 'encrypted_notes';

if (!folderToEncrypt) {
  console.error("Error: Folder to encrypt is not defined");
  process.exit(1);
}

const fileMapping = {};

encryptFolder(folderToEncrypt, encryptedFolder, fileMapping)
  .then(() => encryptMapping(fileMapping, encryptedFolder))
  .then(() => console.log("Encryption complete"))
  .catch((err) => console.error("Encryption failed:", err));
