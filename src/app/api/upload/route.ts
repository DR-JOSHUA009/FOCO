import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";

// Initialize Supabase Admin client for secure server-side operations
const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // docx
  "text/plain",
  "text/markdown",
];
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const notebookId = formData.get("notebook_id") as string;

    if (!file) {
      return NextResponse.json({ error: "No se proporcionó ningún archivo" }, { status: 400 });
    }
    if (!notebookId) {
      return NextResponse.json({ error: "ID de cuaderno faltante" }, { status: 400 });
    }

    // Server-side validation
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Tipo de archivo no permitido" }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "El archivo excede el límite de 25MB" }, { status: 400 });
    }

    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop() || '';
    // Generate a safe unique filename for storage
    const safeFilename = `${uuidv4()}.${fileExtension}`;
    const storagePath = `${user.id}/${notebookId}/${timestamp}_${safeFilename}`;
    const arrayBuffer = await file.arrayBuffer();

    // 1. Upload to Supabase Storage (Private Bucket) using Admin
    const { error: storageError } = await supabaseAdmin.storage
      .from("notebook-files")
      .upload(storagePath, arrayBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (storageError) {
      console.error("[Upload API] Storage error:", storageError);
      return NextResponse.json({ error: "Error al subir el archivo al almacenamiento" }, { status: 500 });
    }

    // Generate a temporary public URL just for the client optimistic UI if they need it, 
    // but in a private bucket, true secure access is via signed URLs. We'll store a placeholder or signed URL.
    // Wait, the schema requires public_url TEXT NOT NULL. Since the bucket is private, 
    // we can't really use a permanent public URL. We'll store the storage path and generate signed URLs dynamically.
    // But to satisfy the schema, we can store a fake URL or empty, but let's store a generic internal URL format.
    const fileId = uuidv4();
    const internalUrl = `/api/files/${fileId}`;

    // 2. Insert record into database using Admin
    const { data: dbData, error: dbError } = await supabaseAdmin
      .from("notebook_files")
      .insert({
        id: fileId,
        user_id: user.id,
        notebook_id: notebookId,
        filename: file.name,
        original_name: file.name,
        file_type: file.type,
        file_size: file.size,
        storage_path: storagePath,
        public_url: internalUrl,
      })
      .select()
      .single();

    if (dbError) {
      console.error("[Upload API] Database insert error:", dbError);
      
      // TRANSACTION ROLLBACK: Delete the file from storage to prevent orphaned files
      const { error: rollbackError } = await supabaseAdmin.storage
        .from("notebook-files")
        .remove([storagePath]);
        
      if (rollbackError) {
        console.error("[Upload API] FATAL: Failed to rollback orphaned file in storage:", rollbackError);
      }

      return NextResponse.json({ error: "Error al guardar el registro. El archivo fue descartado." }, { status: 500 });
    }

    return NextResponse.json({ success: true, file: dbData }, { status: 200 });

  } catch (error: any) {
    console.error("[Upload API] Unexpected error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
