import { NextResponse } from "next/server";

import { publishSupabaseImport } from "@/features/importacoes/supabase-service";
import type { PublishSupabaseImportInput } from "@/features/importacoes/server-types";
import {
  buildImportLimitMessage,
  IMPORT_UPLOAD_LIMIT_BYTES,
} from "@/features/importacoes/upload-limits";

export const runtime = "nodejs";

function limitResponse(size: number) {
  return NextResponse.json(
    {
      status: "error",
      message: buildImportLimitMessage(size),
    },
    { status: 413 },
  );
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);

  if (contentLength > IMPORT_UPLOAD_LIMIT_BYTES) {
    return limitResponse(contentLength);
  }

  try {
    const rawBody = await request.text();
    const bodySize = new TextEncoder().encode(rawBody).byteLength;

    if (bodySize > IMPORT_UPLOAD_LIMIT_BYTES) {
      return limitResponse(bodySize);
    }

    const input = JSON.parse(rawBody) as PublishSupabaseImportInput;
    const result = await publishSupabaseImport(input);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Nao foi possivel processar a publicacao da importacao.",
      },
      { status: 500 },
    );
  }
}
