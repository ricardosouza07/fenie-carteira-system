import type { ImportRecord, ParsedImportResult } from "./types";

export type SupabaseAvailability = "available" | "unconfigured" | "error";

export type ListSupabaseImportsResult = {
  status: SupabaseAvailability;
  records: ImportRecord[];
  message?: string;
};

export type PublishSupabaseImportInput = {
  requestedImportId: string;
  record: ImportRecord;
  result: ParsedImportResult;
};

export type PublishSupabaseImportResult =
  | {
      status: "published";
      record: ImportRecord;
      publishedClients: number;
      createdCustomers: number;
      updatedCustomers: number;
      createdSalespeople: number;
      portfolioItems: number;
      matchedByPhone: number;
      matchedByDocument: number;
      matchedByLegalName: number;
      matchedByTradeNameCity: number;
      message: string;
    }
  | {
      status: "unconfigured" | "error";
      message: string;
    };
