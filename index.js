import fs from "fs/promises";
import path from "path";
/**
 * Recursivamente substitui cada valor por seu nome de chave
 */
function transformKeysToValues(obj) {
  const result = {};
  for (const key in obj) {
    // Garante que só processamos propriedades do próprio objeto (não da protótipo)
    if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
    const currentValue = obj[key];
    if (currentValue !== null && typeof currentValue === "object") {
      // Se for objeto, recursa para os dados internos
      result[key] = transformKeysToValues(currentValue);
    } else {
      // Caso contrário, substitui o valor pelo nome da chave em string
      result[key] = String(key);
    }
  }
  return result;
}
/**
 * Lê e transforma um único arquivo JSON
 */
async function processJsonFile(filePath) {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    const normalizedContent = content.replace(/^\uFEFF/, "");

    let data;
    try {
      data = JSON.parse(normalizedContent);
    } catch (err) {
      console.warn(
        `⚠️ Ignorando ${path.basename(filePath)}: Não é um JSON válido.`,
      );
      return;
    }

    if (!data || typeof data !== "object") {
      console.warn(
        `⚠️ Ignorando ${path.basename(filePath)}: Raiz não é um objeto JSON.`,
      );
      return;
    }

    const transformed = transformKeysToValues(data);
    await fs.writeFile(filePath, JSON.stringify(transformed, null, 2));
    console.log(`✅ Processado e salvo: ${path.basename(filePath)}`);
  } catch (error) {
    console.error(`❌ Erro ao processar ${filePath}:`, error.message);
  }
}
/**
 * Varre uma diretória e processa todos os arquivos .json e .txt que contenham JSON
 */
async function processJsonDirectory(dirPath) {
  try {
    const files = await fs.readdir(dirPath);
    let processedCount = 0;

    for (const file of files) {
      const extension = path.extname(file).toLowerCase();
      const isJsonLikeFile = extension === ".json" || extension === ".txt";

      if (isJsonLikeFile) {
        const filePath = path.join(dirPath, file);
        await processJsonFile(filePath);
        processedCount++;
      }
    }

    console.log(
      `\n🎉 Processamento concluído! Total de arquivos tratados: ${processedCount}`,
    );
  } catch (error) {
    console.error(`❌ Erro ao ler a pasta '${dirPath}':`, error.message);
  }
}
// 🔽 Exemplo de uso (descomente e ajuste o caminho):
processJsonDirectory("./Languages/en-us/Modules");
