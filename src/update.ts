import { encryptFolder, encryptMapping } from "./encrypt.js";
import { gitAmendAndPush } from "./git.js";

const folderToEncrypt = "text_notes";
const encryptedFolder = "encrypted_notes";

if (!folderToEncrypt) {
  console.error("Error: Folder to encrypt is not defined");
  process.exit(0);
}

const fileMapping = {};

encryptFolder(folderToEncrypt, encryptedFolder, fileMapping)
  .then(() => encryptMapping(fileMapping, encryptedFolder))
  .then(() => {
    console.log("Encryption complete");
    gitAmendAndPush()
      .then(() => console.log("updated to repo"))
      .catch((err) => console.log("Error updating to repo:", err));
  })
  .catch((err) => console.error("Encryption failed:", err));
