export default {
  async fetch(request, env, ctx) {
    // CORS headers for browser requests
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    };

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // Route: POST /multipart/initiate - Start multipart upload
      if (path === '/multipart/initiate' && request.method === 'POST') {
        const { fileName, contentType } = await request.json();
        
        if (!fileName) {
          return new Response(JSON.stringify({ error: 'fileName is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const multipartUpload = await env.R2_BUCKET.createMultipartUpload(fileName, {
          httpMetadata: {
            contentType: contentType || 'application/octet-stream'
          }
        });

        return new Response(JSON.stringify({
          uploadId: multipartUpload.uploadId,
          key: multipartUpload.key
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Route: POST /multipart/presign - Generate presigned URLs for parts
      if (path === '/multipart/presign' && request.method === 'POST') {
        const { uploadId, key, partNumbers } = await request.json();
        
        if (!uploadId || !key || !Array.isArray(partNumbers)) {
          return new Response(JSON.stringify({ 
            error: 'uploadId, key, and partNumbers array are required' 
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const multipartUpload = env.R2_BUCKET.resumeMultipartUpload(key, uploadId);
        const presignedUrls = {};

        for (const partNumber of partNumbers) {
          if (partNumber < 1 || partNumber > 10000) {
            return new Response(JSON.stringify({ 
              error: `Invalid part number: ${partNumber}. Must be between 1 and 10000` 
            }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          const presignedUrl = await multipartUpload.uploadPart(partNumber).put({
            signedUrl: true,
            expiresIn: 3600 // 1 hour expiration
          });
          
          presignedUrls[partNumber] = presignedUrl;
        }

        return new Response(JSON.stringify({
          presignedUrls
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Route: POST /multipart/complete - Complete multipart upload
      if (path === '/multipart/complete' && request.method === 'POST') {
        const { uploadId, key, parts } = await request.json();
        
        if (!uploadId || !key || !Array.isArray(parts)) {
          return new Response(JSON.stringify({ 
            error: 'uploadId, key, and parts array are required' 
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const multipartUpload = env.R2_BUCKET.resumeMultipartUpload(key, uploadId);
        
        // Parts should be in format: [{ partNumber: 1, etag: "..." }, ...]
        const uploadedParts = parts.map(part => ({
          partNumber: part.partNumber,
          etag: part.etag
        }));

        const result = await multipartUpload.complete(uploadedParts);

        return new Response(JSON.stringify({
          success: true,
          etag: result.etag,
          key: result.key
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Route: POST /multipart/abort - Abort multipart upload
      if (path === '/multipart/abort' && request.method === 'POST') {
        const { uploadId, key } = await request.json();
        
        if (!uploadId || !key) {
          return new Response(JSON.stringify({ 
            error: 'uploadId and key are required' 
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const multipartUpload = env.R2_BUCKET.resumeMultipartUpload(key, uploadId);
        await multipartUpload.abort();

        return new Response(JSON.stringify({
          success: true,
          message: 'Multipart upload aborted'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Route: GET /multipart/list - List parts of an upload
      if (path === '/multipart/list' && request.method === 'GET') {
        const uploadId = url.searchParams.get('uploadId');
        const key = url.searchParams.get('key');
        
        if (!uploadId || !key) {
          return new Response(JSON.stringify({ 
            error: 'uploadId and key query parameters are required' 
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const multipartUpload = env.R2_BUCKET.resumeMultipartUpload(key, uploadId);
        const parts = await multipartUpload.listParts();

        return new Response(JSON.stringify({
          parts: parts.parts,
          isTruncated: parts.isTruncated,
          nextPartNumberMarker: parts.nextPartNumberMarker
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Default route - API documentation
      if (path === '/' && request.method === 'GET') {
        const apiDocs = {
          name: 'R2 Multipart Upload API',
          endpoints: {
            'POST /multipart/initiate': {
              description: 'Start a new multipart upload',
              body: { fileName: 'string', contentType: 'string (optional)' },
              response: { uploadId: 'string', key: 'string' }
            },
            'POST /multipart/presign': {
              description: 'Generate presigned URLs for upload parts',
              body: { uploadId: 'string', key: 'string', partNumbers: 'number[]' },
              response: { presignedUrls: 'object' }
            },
            'POST /multipart/complete': {
              description: 'Complete the multipart upload',
              body: { uploadId: 'string', key: 'string', parts: 'array' },
              response: { success: 'boolean', etag: 'string', key: 'string' }
            },
            'POST /multipart/abort': {
              description: 'Abort the multipart upload',
              body: { uploadId: 'string', key: 'string' },
              response: { success: 'boolean', message: 'string' }
            },
            'GET /multipart/list': {
              description: 'List uploaded parts',
              query: { uploadId: 'string', key: 'string' },
              response: { parts: 'array', isTruncated: 'boolean' }
            }
          }
        };

        return new Response(JSON.stringify(apiDocs, null, 2), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // 404 for unknown routes
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Error:', error);
      return new Response(JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};