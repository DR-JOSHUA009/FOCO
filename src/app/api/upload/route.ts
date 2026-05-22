import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";

// ============================================
// FOCOI — File Upload + Transcription API
// Handles upload validation, MIME check, and transcription trigger
// ============================================

/**
 * Allowed MIME types and their extensions.
 * Server-side validation — independent from client extension check.
 */
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

/**
 * POST /api/upload
 * 
 * Validates file, uploads to Supabase Storage, creates a file record,
 * and triggers the Lumos transcription pipeline.
 * 
 * Body: FormData with fields:
 *   - file: File
 *   - notebook_id: string
 *   - subject_id: string (for scoping transcription)
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit: 30 uploads per hour
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

    // ── Create Service Role Client (Bypass RLS) ──
    const { createClient: createAdminClient } = await import("@supabase/supabase-js");
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // ── Server-side MIME validation ──
    if (!ALLOWED_TYPES[file.type]) {
      return NextResponse.json({ 
        error: "Unsupported file type",
        allowed: Object.keys(ALLOWED_TYPES)
      }, { status: 415 });
    }

    // ── Size validation ──
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ 
        error: `File exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` 
      }, { status: 413 });
    }

    // ── [NEEDS BACKEND] Virus/malware scan hook ──
    // In production, call a malware scanning service (e.g. ClamAV, VirusTotal)
    // before proceeding with storage and transcription.
    // const scanResult = await scanForMalware(file);
    // if (scanResult.infected) {
    //   return NextResponse.json({ error: "File flagged as malicious" }, { status: 422 });
    // }

    // ── Upload to Supabase Storage ──
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${notebookId}/${timestamp}_${safeName}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabaseAdmin.storage
      .from("notebook_files")
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 });
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from("notebook_files")
      .getPublicUrl(storagePath);

    // ── Create file record in database ──
    // [NEEDS BACKEND] Create `notebook_file_records` table:
    //   id (uuid), user_id (uuid), notebook_id (uuid), subject_id (text),
    //   file_name (text), storage_path (text), public_url (text),
    //   mime_type (text), size_bytes (int), 
    //   transcription_status (text: 'pending'|'processing'|'completed'|'failed'),
    //   transcription_text (text nullable),
    //   created_at (timestamptz)
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
      console.error("DB insert error:", insertError);
      // File was uploaded but record failed — still return success
      // but log for manual cleanup
      return NextResponse.json({
        success: true,
        file: {
          name: file.name,
          url: publicUrl,
          path: storagePath,
          type: file.type,
          size: file.size,
          transcription_status: "pending",
        },
        warning: "File uploaded but database record failed. Transcription will not trigger.",
      });
    }

    // ── Trigger Lumos transcription pipeline (async) ──
    // Fire-and-forget: don't block the upload response
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
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * Triggers the Lumos transcription pipeline for a file.
 * Updates the file record status as it progresses.
 * 
 * [NEEDS BACKEND] In production, this would:
 * 1. Send the file URL to an OCR/ASR service (Groq Whisper for audio, 
 *    Groq Vision for images/PDFs, or a dedicated OCR service)
 * 2. Poll or receive a webhook for completion
 * 3. Store the transcription text in the database
 * 
 * For now, this simulates the pipeline with a status update.
 */
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

  // Update status to 'processing'
  await supabaseAdmin
    .from("notebook_file_records")
    .update({ transcription_status: "processing" })
    .eq("id", fileRecordId);

  try {
    // [NEEDS BACKEND] Replace this with actual transcription service call:
    //
    // For images: Use Groq Vision API or Google Cloud Vision OCR
    //   const transcription = await groq.chat.completions.create({
    //     model: "llava-v1.5-7b-4096-preview",
    //     messages: [{ role: "user", content: [
    //       { type: "image_url", image_url: { url: fileUrl } },
    //       { type: "text", text: "Transcribe all text visible in this image." }
    //     ]}]
    //   });
    //
    // For PDFs: Use a PDF parsing library (pdf-parse) server-side
    //   const pdfBuffer = await fetch(fileUrl).then(r => r.arrayBuffer());
    //   const pdfData = await pdfParse(Buffer.from(pdfBuffer));
    //   const transcription = pdfData.text;
    //
    // For audio: Use Groq Whisper API
    //   const transcription = await groq.audio.transcriptions.create({
    //     file: fileUrl, model: "whisper-large-v3"
    //   });
    //
    // For text/markdown: Just read the file content directly
    //   const text = await fetch(fileUrl).then(r => r.text());

    // Placeholder: mark as completed with empty text
    // In production, replace with actual transcription result
    await supabaseAdmin
      .from("notebook_file_records")
      .update({
        transcription_status: "completed",
        transcription_text: "[NEEDS BACKEND] Transcription service not yet configured. Connect Groq Vision/Whisper API to enable auto-transcription.",
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

