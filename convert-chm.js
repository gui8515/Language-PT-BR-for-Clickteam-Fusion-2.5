import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { convertChm } from "@chm-md/core";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourceHelpDir = path.join(__dirname, "Languages", "en-us", "Help");
const targetHelpDir = path.join(__dirname, "Languages", "pt-br", "Help");
const singleSiteRoot = path.join(__dirname, "site", "mmf2");
const singleDocsRoot = path.join(singleSiteRoot, "docs");
const tempRoot = path.join(singleSiteRoot, ".tmp-chm");

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

async function ensureSingleProjectLayout() {
  await fs.rm(singleDocsRoot, { recursive: true, force: true });
  await fs.rm(tempRoot, { recursive: true, force: true });
  await fs.mkdir(singleDocsRoot, { recursive: true });
  await fs.mkdir(path.join(singleDocsRoot, ".vitepress"), { recursive: true });

  const configContent = `import { defineConfig } from "vitepress";

export default defineConfig({
  title: "Clickteam Fusion Developer Help",
  description: "Single VitePress project containing all CHM documentation",
  ignoreDeadLinks: true,
  vite: {
    assetsInclude: [
      "**/*.gif",
      "**/*.GIF",
      "**/*.png",
      "**/*.PNG",
      "**/*.jpg",
      "**/*.JPG",
      "**/*.jpeg",
      "**/*.JPEG",
      "**/*.svg",
      "**/*.SVG",
      "**/*.webp",
      "**/*.WEBP",
    ],
  },
});
`;

  await fs.writeFile(
    path.join(singleDocsRoot, ".vitepress", "config.ts"),
    configContent,
    "utf8",
  );
}

async function buildSingleChm(chmPath) {
  const relative = path.relative(sourceHelpDir, chmPath);
  const baseName = path.basename(relative, ".chm");
  const tempProjectDir = path.join(tempRoot, baseName);
  const targetDir = path.join(singleDocsRoot, baseName);
  const targetAssetsDir = path.join(singleDocsRoot, "assets", baseName);

  await fs.rm(tempProjectDir, { recursive: true, force: true });
  await fs.mkdir(tempProjectDir, { recursive: true });

  console.log(`Convertendo: ${relative}`);
  await convertChm({
    sourcePath: chmPath,
    outputDir: tempProjectDir,
    lint: false,
    force: true,
  });

  const pagesDir = path.join(tempProjectDir, "pages");
  const assetsDir = path.join(tempProjectDir, "assets");

  await fs.rm(targetDir, { recursive: true, force: true });
  await fs.mkdir(targetDir, { recursive: true });

  try {
    await fs.access(pagesDir);
    await fs.cp(pagesDir, targetDir, { recursive: true, force: true });
  } catch {
    // Alguns CHM não geram uma estrutura de páginas suficiente; o conteúdo pode ficar vazio, mas o site continua válido.
  }

  await fs.rm(targetAssetsDir, { recursive: true, force: true });
  try {
    await fs.access(assetsDir);
    await fs.mkdir(targetAssetsDir, { recursive: true });
    await fs.cp(assetsDir, targetAssetsDir, { recursive: true, force: true });
  } catch {
    // Alguns CHM não possuem assets próprios.
  }

  const markdownFiles = (await listFiles(targetDir)).filter((file) =>
    file.endsWith(".md"),
  );
  for (const filePath of markdownFiles) {
    const content = await fs.readFile(filePath, "utf8");
    const fixedContent = content.replace(/\/assets\//g, `/assets/${baseName}/`);
    await fs.writeFile(filePath, fixedContent, "utf8");
  }

  console.log(`Gerado seção: ${baseName}`);
}

async function writeHomeIndex(chmFiles) {
  const names = chmFiles
    .map((file) => path.basename(file, ".chm"))
    .sort((a, b) => a.localeCompare(b));

  const links = names.map((name) => `- [${name}](/${name}/)`).join("\n");
  const content = `# Clickteam Fusion Developer Help\n\n${links}\n`;

  await fs.writeFile(path.join(singleDocsRoot, "index.md"), content, "utf8");
}

async function main() {
  await fs.mkdir(targetHelpDir, { recursive: true });
  await fs.mkdir(singleSiteRoot, { recursive: true });
  await ensureSingleProjectLayout();

  const files = await listFiles(sourceHelpDir);
  const chmFiles = files.filter((file) => file.toLowerCase().endsWith(".chm"));

  if (chmFiles.length === 0) {
    console.log(`Nenhum arquivo .chm encontrado em ${sourceHelpDir}.`);
    return;
  }

  for (const chmFile of chmFiles) {
    await buildSingleChm(chmFile);
  }

  await writeHomeIndex(chmFiles);

  console.log(
    `\nProcessamento concluído para ${targetHelpDir} e projeto único em ${singleDocsRoot}.`,
  );
}

main().catch((error) => {
  console.error("Erro ao converter arquivos CHM:", error.message);
  process.exit(1);
});
