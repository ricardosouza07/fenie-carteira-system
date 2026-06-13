import * as XLSX from "xlsx";

export const officialImportHeaders = [
  "Razão Social",
  "Nome fantasia",
  "E-mail",
  "Telefone",
  "Cidade",
  "Estado",
  "Data do último pedido",
  "Vendedor do último pedido",
  "Valor do último pedido",
  "Dias sem comprar",
  "Ciclo médio de compra",
  "Próxima compra prevista",
  "Situação",
  "Bairro",
  "CEP",
  "Endereço",
];

export const requiredImportColumns = [
  "Razão Social ou Nome fantasia",
  "Telefone ou Cidade",
  "Dias sem comprar ou Data do último pedido",
];

export const optionalImportColumns = [
  "E-mail",
  "Estado",
  "Vendedor do último pedido",
  "Valor do último pedido",
  "Ciclo médio de compra",
  "Próxima compra prevista",
  "Situação",
  "Bairro",
  "CEP",
  "Endereço",
];

export const quickImportGuidelines = [
  "Use a primeira aba da planilha para a carteira.",
  "Linhas acima do cabeçalho são permitidas; o cabeçalho será detectado.",
  "Mantenha os nomes das colunas oficiais sempre que possível.",
  "Datas podem estar em formato brasileiro ou ISO, como 26/05/2026.",
  "Colunas extras serão ignoradas nesta fase do MVP.",
];

const templateRows: (string | number)[][] = [
  ["Modelo de importação da carteira Fenié PRO"],
  ["Preencha os clientes a partir da linha 6. Não remova os cabeçalhos oficiais."],
  [
    "Obrigatórias",
    "Razão Social ou Nome fantasia; Telefone ou Cidade; Dias sem comprar ou Data do último pedido.",
  ],
  [
    "Classificação",
    "0-30 saudável, 31-60 atenção, 61-89 risco, 90+ inativo antigo.",
  ],
  [],
  officialImportHeaders,
  [
    "Studio Beleza Exemplo Ltda",
    "Studio Beleza Exemplo",
    "compras@exemplo.com.br",
    "(41) 99999-0000",
    "Curitiba",
    "PR",
    "02/05/2026",
    "Camila Rocha",
    1280,
    24,
    30,
    "01/06/2026",
    "Ativo",
    "Centro",
    "80000-000",
    "Rua Exemplo, 123",
  ],
];

const instructionRows = [
  ["Instruções básicas", ""],
  ["1", "Use a primeira aba para a carteira. O sistema lê somente a primeira aba nesta fase."],
  ["2", "O cabeçalho pode ficar abaixo de linhas introdutórias, como no modelo."],
  ["3", "Informe Dias sem comprar ou Data do último pedido para calcular a classificação."],
  ["4", "Possíveis duplicados são detectados por telefone ou por nome/cidade."],
  ["5", "Depois do preview, a publicação fica salva apenas no localStorage do navegador."],
  [],
  ["Colunas obrigatórias", requiredImportColumns.join("; ")],
  ["Colunas opcionais", optionalImportColumns.join("; ")],
];

export function downloadImportTemplate() {
  const workbook = XLSX.utils.book_new();
  const portfolioSheet = XLSX.utils.aoa_to_sheet(templateRows);
  const instructionsSheet = XLSX.utils.aoa_to_sheet(instructionRows);

  portfolioSheet["!cols"] = officialImportHeaders.map((header) => ({
    wch: Math.min(Math.max(header.length + 4, 16), 30),
  }));
  instructionsSheet["!cols"] = [{ wch: 24 }, { wch: 92 }];

  XLSX.utils.book_append_sheet(workbook, portfolioSheet, "Carteira");
  XLSX.utils.book_append_sheet(workbook, instructionsSheet, "Instruções");

  const output = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
  }) as ArrayBuffer;
  const blob = new Blob([output], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = "modelo-importacao-carteira-fenie.xlsx";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
