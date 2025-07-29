import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
const UPLOAD_DIR = 'uploads';
export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    
    // Parse request body
    const body = await request.json();
    const { fileName, contentType, expiresIn = 3600 } = body;
    
    if (!fileName) {
      return new Response(JSON.stringify({ error: 'fileName is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Initialize S3 client for R2
    const s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      },
    });
    
    const key = `${UPLOAD_DIR}/${fileName}`;

    // Create the PutObject command
    const command = new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    });
    
    // Generate presigned URL
    const uploadUrl = await getSignedUrl(s3Client, command, {
      expiresIn: expiresIn
    });
    
    // Construct public URL
    const publicUrl = env.R2_CUSTOM_DOMAIN 
      ? `https://${env.R2_CUSTOM_DOMAIN}/${key}`
      : `https://${env.R2_BUCKET_NAME}.${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${key}`;
    
    return new Response(JSON.stringify({
      uploadUrl: uploadUrl,
      fileName: key,
      expiresIn: expiresIn,
      publicUrl: publicUrl
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
    
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to generate upload URL',
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Handle CORS preflight requests
export async function onRequestOptions() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}