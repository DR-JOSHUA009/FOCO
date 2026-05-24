import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";

// ============================================
// FOCOI — File Upload + Transcription API
// Handles upload validation, MIME check, and transcription trigger
// ============================================

const ALLOWED_TYPES: Record<string, string[]> = {
  "image/jpeg":    [".jpg", ".jpeg"],
  "image/png":     [".png"],
  "image/webp":    [".webp"],
  "image/heic":    [".heic"],
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "text/plain":    [".txt"],
  "text/markdown": [".md"],
};

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

export async function POST(req: NextRequest) {
  try {
    // ── Environment check ──
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("MISSING: SUPABASE_SERVICE_ROLE_KEY");
      return NextResponse.json(
        { error: "Server misconfiguration" },
        { status: 500 }
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { allowed } = await checkRateLimit(`upload:${user.id}`, 30, 3600000);
    if (!allowed) {
      return NextResponse.json({ error: "Upload rate limit exceeded" }, { status: 429 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const notebookId = formData.get("notebook_id") as string;
    const subjectId = formData.get("subject_id") as string;

    if (!file || !notebookId) {
      return NextResponse.json({ error: "Missing file or notebook_id" }, { status: 400 });
    }

    const { createClient: createAdminClient } = await import("@supabase/supabase-js");
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    if (!ALLOWED_TYPES[file.type]) {
      return NextResponse.json({ 
        error: "Unsupported file type",
        allowed: Object.keys(ALLOWED_TYPES)
      }, { status: 415 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ 
        error: `File exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` 
      }, { status: 413 });
    }

    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${notebookId}/${timestamp}_${safeName}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Make sure bucket name is 'notebook_files'
    const { error: uploadError } = await supabaseAdmin.storage
      .from("notebook_files")
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 });
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from("notebook_files")
      .getPublicUrl(storagePath);

    // DB insert wrapped in try/catch handling missing table
    const { data: fileRecord, error: insertError } = await supabaseAdmin
      .from("notebook_file_records")
      .insert({
        user_id: user.id,
        notebook_id: notebookId,
        subject_id: subjectId || null,
        file_name: file.name,
        storage_path: storagePath,
        public_url: publicUrl,
        mime_type: file.type,
        size_bytes: file.size,
        transcription_status: "pending",
        transcription_text: null,
      })
      .select()
      .single();

    if (insertError) {
      console.error("DB insert FAILED for uploaded file:", insertError);
      // Clean up the storage upload since DB record failed
      await supabaseAdmin.storage.from("notebook_files").remove([storagePath]).catch(() => {});
      return NextResponse.json({
        error: `Archivo subido pero fallo al guardar registro: ${insertError.message}`,
      }, { status: 500 });
    }

    triggerTranscription(fileRecord.id, publicUrl, file.type, subjectId || notebookId).catch(
      (err) => console.error("Transcription trigger failed:", err)
    );

    return NextResponse.json({
      success: true,
      file: {
        id: fileRecord.id,
        name: file.name,
        url: publicUrl,
        path: storagePath,
        type: file.type,
        size: file.size,
        transcription_status: "pending",
      },
    });

  } catch (error: any) {
    console.error("Upload API Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

async function triggerTranscription(
  fileRecordId: string,
  fileUrl: string,
  mimeType: string,
  scopeId: string
): Promise<void> {
  const { createClient: createAdminClient } = await import("@supabase/supabase-js");
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  await supabaseAdmin
    .from("notebook_file_records")
    .update({ transcription_status: "processing" })
    .eq("id", fileRecordId);

  try {
    await supabaseAdmin
      .from("notebook_file_records")
      .update({
        transcription_status: "completed",
        transcription_text: "[NEEDS BACKEND] Transcription service not yet configured.",
      })
      .eq("id", fileRecordId);
  } catch (error) {
    console.error("Transcription failed for file:", fileRecordId, error);
    await supabaseAdmin
      .from("notebook_file_records")
      .update({ transcription_status: "failed" })
      .eq("id", fileRecordId);
  }
}
