export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const { filename, contentType, imageId } = await request.json();

    // Validate input
    if (!filename || !contentType) {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields: filename, contentType' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const uniqueFilename = `${imageId || 'image'}-${timestamp}-${filename}`;

    // Create pre-signed URL for R2
    const uploadUrl = await env.R2_BUCKET.createPresignedUrl(uniqueFilename, {
      method: 'PUT',
      expiresIn: 300, // 5 minutes
      httpMetadata: {
        contentType: contentType,
      },
    });

    // Return the upload URL and file info
    return new Response(JSON.stringify({
      uploadUrl: uploadUrl,
      fields: {
        key: uniqueFilename,
        'Content-Type': contentType,
      },
      headers: {
        'Content-Type': contentType,
      },
      fileUrl: `${env.R2_PUBLIC_URL}/${uniqueFilename}`,
      filename: uniqueFilename
    }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });

  } catch (error) {
    console.error('Error generating upload URL:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to generate upload URL',
      details: error.message 
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

// Handle CORS preflight requests
export async function onRequestOptions(context) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
} 