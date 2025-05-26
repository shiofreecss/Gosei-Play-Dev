# Deploying to Netlify

This guide helps you deploy your Gosei Play application to Netlify.

## Prerequisites

1. A [Netlify account](https://app.netlify.com/signup)
2. Your project pushed to a Git repository (GitHub, GitLab, or Bitbucket)

## Deployment Steps

### Option 1: Deploy via Netlify UI

1. Log in to your [Netlify account](https://app.netlify.com/)
2. Click "Add new site" > "Import an existing project"
3. Connect to your Git provider and select your repository
4. Configure the deployment with these settings:
   - Build command: `npm run build`
   - Publish directory: `build`
5. Click "Deploy site"

### Option 2: Deploy with Netlify CLI

1. Install Netlify CLI globally:
   ```
   npm install netlify-cli -g
   ```

2. Log in to Netlify from the terminal:
   ```
   netlify login
   ```

3. Initialize Netlify in your project (from project root):
   ```
   netlify init
   ```

4. Follow the prompts to either:
   - Create & configure a new site
   - Link to an existing site

5. Deploy your site:
   ```
   netlify deploy --prod
   ```

## Environment Variables

If your application uses environment variables, add them in the Netlify UI:
1. Go to Site settings > Build & deploy > Environment
2. Add the variables needed by your application

## Continuous Deployment

Netlify automatically sets up continuous deployment when you connect your repository. Each push to your main branch will trigger a new deployment.

## Custom Domain

To set up a custom domain:
1. Go to Site settings > Domain management
2. Click "Add custom domain"
3. Follow the instructions to configure your DNS settings

## Troubleshooting

- If you encounter build errors, check the build logs in the Netlify UI
- Ensure your project builds successfully locally with `npm run build`
- Verify that all dependencies are correctly listed in your package.json 