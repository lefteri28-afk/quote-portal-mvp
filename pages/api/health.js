export default function handler(req, res) {
  res.setHeader('X-Commit', process.env.VERCEL_GIT_COMMIT_SHA || 'unknown');
  res.status(200).json({
    ok: true,
    route: '/api/health',
    commit: process.env.VERCEL_GIT_COMMIT_SHA || null
  });
}
