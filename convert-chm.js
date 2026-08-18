import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { convertChm } from "@chm-md/core";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourceHelpDir = path.join(__dirname, "Languages", "en-us", "Help");
const targetHelpDir = path.join(__dirname, "Languages", "pt-br", "Help");

async function listFiles(dirPath) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await listFiles(fullPath)));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

async function convertChmFile(chmPath, outDir) {
  await convertChm({
    sourcePath: chmPath,
    outputDir: outDir,
    lint: false,
    force: true,
  });
}

async function main() {
  await fs.mkdir(targetHelpDir, { recursive: true });

  const files = await listFiles(sourceHelpDir);
  const chmFiles = files.filter((file) => file.toLowerCase().endsWith(".chm"));

  if (chmFiles.length === 0) {
    console.log(`Nenhum arquivo .chm encontrado em ${sourceHelpDir}.`);
    return;
  }

  for (const chmFile of chmFiles) {
    const relative = path.relative(sourceHelpDir, chmFile);
    const baseName = path.basename(relative, ".chm");
    const outputDir = path.join(targetHelpDir, baseName);

    console.log(`Convertendo: ${relative}`);
    await convertChmFile(chmFile, outputDir);
  }

  console.log(`\nConversão concluída para ${targetHelpDir}.`);
}

main().catch((error) => {
  console.error("Erro ao converter arquivos CHM:", error.message);
  process.exit(1);
});
