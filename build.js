import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourceRoot = path.join(__dirname, "Languages", "en-us");
const targetRoot = path.join(__dirname, "Languages", "pt-br");

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function copyDirectory(srcDir, destDir) {
  await ensureDir(destDir);

  const entries = await fs.readdir(srcDir, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);

    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath);
      continue;
    }

    await fs.copyFile(srcPath, destPath);
  }
}

async function walkFiles(dirPath) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await walkFiles(fullPath)));
    } else {
      files.push(fullPath);
    }
  }

  return files;
}

async function build() {
  await ensureDir(targetRoot);
  await copyDirectory(sourceRoot, targetRoot);

  const files = await walkFiles(sourceRoot);
  let convertedCount = 0;

  for (const filePath of files) {
    if (!filePath.toLowerCase().endsWith(".json")) continue;

    const relativePath = path.relative(sourceRoot, filePath);
    const targetJsonPath = path.join(targetRoot, relativePath);
    const targetTxtPath = path.join(targetRoot, relativePath).replace(/\.json$/i, ".txt");

    try {
      const content = await fs.readFile(filePath, "utf-8");
      const data = JSON.parse(content);

      if (!data || typeof data !== "object") continue;
      if (data.version !== "1" || data.lang !== "1046") continue;

      await ensureDir(path.dirname(targetTxtPath));
      await fs.writeFile(targetTxtPath, content, "utf-8");

      try {
        await fs.rm(targetJsonPath, { force: true });
      } catch {
        // Ignora falhas de remoção em arquivos que não existem
      }

      convertedCount += 1;
      console.log(`Convertido: ${relativePath} -> ${path.basename(targetTxtPath)}`);
    } catch {
      // Ignora arquivos JSON inválidos
    }
  }

  console.log(`\nBuild concluído. ${convertedCount} arquivos JSON com version/lang convertidos para .txt em ${path.relative(__dirname, targetRoot)}.`);
}

build().catch((error) => {
  console.error("Erro no build:", error);
  process.exit(1);
});
