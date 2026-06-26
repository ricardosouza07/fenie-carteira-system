import * as XLSX from "xlsx";

export const officialImportHeaders = [
  "Razão Social",
  "Nome fantasia",
  "CNPJ/CPF",
  "Inscrição Estadual",
  "E-mail",
  "Telefone",
  "Cidade",
  "Estado",
  "Último pedido",
  "Data do último pedido",
  "Vendedor do último pedido",
  "Valor do último pedido",
  "Dias sem comprar",
  "Ciclo médio de compra",
  "Próxima compra prevista",
  "Situação",
  "Data de cadastro",
  "Origem do cadastro",
  "Bairro",
  "CEP",
  "Endereço",
  "Acesso B2B",
  "Segmento",
  "Tags de cliente",
  "Próxima tarefa",
  "Data da tarefa",
];

export const requiredImportColumns = [
  "Razão Social ou Nome fantasia",
  "Telefone ou Cidade",
  "Dias sem comprar ou Data do último pedido",
];

export const optionalImportColumns = [
  "E-mail",
  "CNPJ/CPF",
  "Inscrição Estadual",
  "Estado",
  "Último pedido",
  "Vendedor do último pedido",
  "Valor do último pedido",
  "Ciclo médio de compra",
  "Próxima compra prevista",
  "Situação",
  "Data de cadastro",
  "Origem do cadastro",
  "Bairro",
  "CEP",
  "Endereço",
  "Acesso B2B",
  "Segmento",
  "Tags de cliente",
  "Próxima tarefa",
  "Data da tarefa",
];

export const quickImportGuidelines = [
  "Você pode enviar a planilha original baixada do Mercos em .xls ou .xlsx.",
  "Linhas de título e filtros acima do cabeçalho são ignoradas automaticamente.",
  "O cabeçalho deve conter campos como Razão Social, Nome fantasia, CNPJ/CPF e Telefone.",
  "Datas podem estar em formato brasileiro ou ISO, como 26/05/2026.",
  "Colunas extras serão armazenadas apenas se estiverem mapeadas no importador.",
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
    "0-59 saudável, 60-89 atenção, 90-179 risco, 180+ inativo antigo.",
  ],
  [],
  officialImportHeaders,
  [
    "Studio Beleza Exemplo Ltda",
    "Studio Beleza Exemplo",
    "12.345.678/0001-90",
    "123456789",
    "compras@exemplo.com.br",
    "(41) 99999-0000",
    "Curitiba",
    "PR",
    "27470",
    "02/05/2026",
    "Camila Rocha",
    1280,
    24,
    30,
    "01/06/2026",
    "Ativo",
    "10/01/2024",
    "Cadastro manual - app",
    "Centro",
    "80000-000",
    "Rua Exemplo, 123",
    "Sim",
    "Profissional",
    "Glynett, MUP",
    "Visita",
    "15/06/2026",
  ],
];

const instructionRows = [
  ["Instruções básicas", ""],
  ["1", "Use a primeira aba para a carteira. O sistema lê somente a primeira aba nesta fase."],
  ["2", "A planilha original do Mercos pode conter título, filtros, segmento, período e situações antes do cabeçalho."],
  ["3", "Informe Dias sem comprar ou Data do último pedido para calcular a classificação."],
  ["4", "Clientes existentes são cruzados por telefone, CNPJ/CPF, razão social ou nome fantasia + cidade."],
  ["5", "Ao publicar, interações, follow-ups, pontos, conversões e situação financeira não são sobrescritos."],
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
