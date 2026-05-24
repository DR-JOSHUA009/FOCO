import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return new NextResponse("No autorizado", { status: 401 });
    }

    const fileId = params.id;

    // 1. Verify ownership and get storage path
    const { data: fileRecord, error: dbError } = await supabaseAdmin
      .from("notebook_files")
      .select("storage_path, user_id, filename")
      .eq("id", fileId)
      .single();

    if (dbError || !fileRecord) {
      return new NextResponse("Archivo no encontrado", { status: 404 });
    }

    if (fileRecord.user_id !== user.id) {
      return new NextResponse("No autorizado para ver este archivo", { status: 403 });
    }

    // 2. Generate signed URL (valid for 60 minutes)
    const { data: signedData, error: signedError } = await supabaseAdmin.storage
      .from("notebook-files")
      .createSignedUrl(fileRecord.storage_path, 3600, {
        download: fileRecord.filename // forces browser download with the correct original filename
      });

    if (signedError || !signedData) {
      console.error("[Download API] Error generating signed URL:", signedError);
      return new NextResponse("Error al generar enlace de descarga", { status: 500 });
    }

    // Redirect to the signed URL so the browser starts the download
    return NextResponse.redirect(signedData.signedUrl);

  } catch (error) {
    console.error("[Download API] Unexpected error:", error);
    return new NextResponse("Error interno del servidor", { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const fileId = params.id;

    // 1. Verify ownership and get storage path
    const { data: fileRecord, error: dbError } = await supabaseAdmin
      .from("notebook_files")
      .select("storage_path, user_id")
      .eq("id", fileId)
      .single();

    if (dbError || !fileRecord) {
      return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });
    }

    if (fileRecord.user_id !== user.id) {
      return NextResponse.json({ error: "No autorizado para eliminar este archivo" }, { status: 403 });
    }

    // 2. Delete from Storage via Admin
    const { error: storageError } = await supabaseAdmin.storage
      .from("notebook-files")
      .remove([fileRecord.storage_path]);

    if (storageError) {
      console.error("[Delete API] Storage error:", storageError);
      return NextResponse.json({ error: "Error al eliminar el archivo del almacenamiento" }, { status: 500 });
    }

    // 3. Delete from Database via Admin
    const { error: deleteError } = await supabaseAdmin
      .from("notebook_files")
      .delete()
      .eq("id", fileId);

    if (deleteError) {
      console.error("[Delete API] Database delete error:", deleteError);
      return NextResponse.json({ error: "Error al eliminar el registro de la base de datos" }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    console.error("[Delete API] Unexpected error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
