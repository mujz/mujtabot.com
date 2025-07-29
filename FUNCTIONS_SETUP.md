# Cloudflare Pages Functions Setup for Image Uploads

This setup enables direct image uploads to Cloudflare R2 using pre-signed URLs through Cloudflare Pages Functions.

## Prerequisites

1. **Cloudflare R2 Bucket**: Create an R2 bucket in your Cloudflare dashboard
2. **Custom Domain** (Optional): Set up a custom domain for your R2 bucket for direct access

## Setup Steps

### 1. Create R2 Bucket

1. Go to Cloudflare Dashboard → R2 Object Storage
2. Create a new bucket (e.g., `mujtabot-images`)
3. Note the bucket name for configuration

### 2. Configure Environment Variables

In your Cloudflare Pages project settings:

1. Go to **Settings** → **Environment variables**
2. Add the following variables:

#### Production Environment:
- `R2_BUCKET`: Your R2 bucket binding name (e.g., `R2_BUCKET`)
- `R2_PUBLIC_URL`: Your custom domain or R2 public URL

#### Preview Environment:
- `R2_BUCKET`: Your R2 bucket binding name (e.g., `R2_BUCKET`)
- `R2_PUBLIC_URL`: Your preview domain or R2 public URL

### 3. Configure R2 Bucket Binding

1. Go to **Settings** → **Functions**
2. Under **R2 Object Storage**, add a new binding:
   - **Variable name**: `R2_BUCKET`
   - **Bucket**: Select your R2 bucket

### 4. Update Configuration Files

Update `wrangler.toml` with your actual bucket names and domains:

```toml
[[env.production.r2_buckets]]
binding = "R2_BUCKET"
bucket_name = "your-actual-bucket-name"

[env.production.vars]
R2_PUBLIC_URL = "https://your-actual-domain.com"
```

### 5. Deploy

The Functions will be automatically deployed when you push to your repository:

```bash
git add .
git commit -m "Add image upload functionality"
git push
```

## API Endpoints

### POST `/api/get-upload-url`
Generates pre-signed URLs for direct R2 uploads.

**Request Body:**
```json
{
  "filename": "image.jpg",
  "contentType": "image/jpeg",
  "imageId": "profile_pic"
}
```

**Response:**
```json
{
  "uploadUrl": "https://...",
  "fields": {
    "key": "profile_pic-1234567890-image.jpg",
    "Content-Type": "image/jpeg"
  },
  "fileUrl": "https://your-domain.com/api/images/profile_pic-1234567890-image.jpg"
}
```

### GET `/api/images/[filename]`
Serves uploaded images from R2.

## Usage in Shortcode

The IMAGE_BLANK shortcode automatically uses these endpoints:

```markdown
<code>__IMAGE_BLANK__:profile_pic:Upload Profile Picture</code>
```

## Security Considerations

1. **Pre-signed URLs**: URLs expire after 5 minutes
2. **File Validation**: Only image files are allowed
3. **Size Limits**: 5MB maximum file size
4. **CORS**: Configured for cross-origin requests

## Troubleshooting

### Common Issues:

1. **"R2_BUCKET is not defined"**
   - Check that the R2 binding is configured in Pages settings
   - Verify the binding name matches your environment variables

2. **"Failed to generate upload URL"**
   - Check R2 bucket permissions
   - Verify bucket name in configuration

3. **Images not displaying**
   - Check that the image serving endpoint is working
   - Verify file URLs are correct

### Debug Mode:

Enable debug logging by adding `console.log` statements in the Functions.

## Cost Considerations

- **R2 Storage**: $0.015 per GB per month
- **R2 Operations**: $4.50 per million Class A operations
- **Functions**: 100,000 requests per day free, then $0.50 per million

## Support

For issues with this setup, check:
1. Cloudflare Pages documentation
2. R2 Object Storage documentation
3. Functions documentation 