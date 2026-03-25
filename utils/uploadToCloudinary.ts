// utils/uploadToCloudinary.ts
import cloudinary from "@/lib/cloudinary";

export async function uploadToCloudinary(file: File, folder: string) {
  const buffer = await file.arrayBuffer();

  return new Promise<string>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result?.secure_url || "");
      }
    );

    stream.end(Buffer.from(buffer));
  });
}