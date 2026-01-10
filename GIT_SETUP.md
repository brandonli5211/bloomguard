# Git Setup Instructions

## Files That Are Properly Ignored

The following files and directories are now properly ignored and will NOT be committed:

### Environment Files
- `.env` - Environment variables (backend)
- `.env.local` - Local environment variables (frontend)
- `.env.*.local` - All local environment variants
- `.cursorrules` - Cursor IDE rules (not for git)

### Build & Dependencies
- `node_modules/` - Node.js dependencies
- `frontend/.next/` - Next.js build output
- `frontend/out/` - Next.js export output
- `frontend/.vercel/` - Vercel deployment files
- `frontend/*.tsbuildinfo` - TypeScript build info
- `frontend/next-env.d.ts` - Next.js TypeScript declarations

### Python
- `backend/venv/` - Python virtual environment
- `backend/env/` - Alternative venv location
- `backend/.venv/` - Alternative venv location
- `__pycache__/` - Python cache files
- `*.pyc`, `*.pyo`, `*.pyd` - Compiled Python files
- `*.egg-info/` - Python package metadata

### IDE & OS Files
- `.vscode/` - VS Code settings
- `.idea/` - IntelliJ IDEA settings
- `.DS_Store` - macOS system file
- `Thumbs.db` - Windows system file
- `*.swp`, `*.swo` - Vim swap files

### Logs & Temporary Files
- `*.log` - All log files
- `*.tmp`, `*.temp` - Temporary files
- `.cache/` - Cache directories

## Files Ready to Commit

The following files are tracked and ready to be committed:

### Frontend
- `frontend/app/components/LakeMap.tsx` - Map component
- `frontend/app/page.tsx` - Main page
- `frontend/public/demo_heatmap.png` - Demo heatmap image
- `frontend/package.json` - Dependencies
- `frontend/package-lock.json` - Lock file
- `frontend/tsconfig.json` - TypeScript config
- `frontend/SETUP.md` - Setup documentation
- `frontend/.gitignore` - Frontend gitignore

### Root
- `.gitignore` - Root gitignore (updated)

## Next Steps

### 1. Review What Will Be Committed
```bash
git status
```

### 2. Stage Files for Commit
```bash
git add frontend/app/components/
git add frontend/public/
git add frontend/app/page.tsx
git add frontend/package.json
git add frontend/package-lock.json
git add frontend/tsconfig.json
git add frontend/SETUP.md
git add frontend/.gitignore
git add .gitignore
```

Or stage all changes at once:
```bash
git add .
```

### 3. Verify What's Staged
```bash
git status
```

Make sure you don't see:
- ❌ `.env.local` or any `.env` files
- ❌ `node_modules/`
- ❌ `.next/`
- ❌ `.cursorrules`

### 4. Commit Your Changes
```bash
git commit -m "feat: Add LakeMap component with Mapbox integration

- Add LakeMap component with image overlay and drift prediction line
- Update page.tsx to use LakeMap component
- Add demo heatmap image
- Update dependencies (Next.js 15, react-map-gl, mapbox-gl)
- Add comprehensive .gitignore files
- Add SETUP.md documentation"
```

### 5. Push to Remote
```bash
git push origin frontend-dev
```

## Important Notes

⚠️ **Never commit:**
- API keys or tokens (`.env.local`, `.env`)
- `node_modules/` (dependencies)
- Build outputs (`.next/`, `out/`)
- Virtual environments (`venv/`, `.venv`)
- IDE-specific files (`.vscode/`, `.idea/`)

✅ **Always commit:**
- Source code (`.tsx`, `.ts`, `.py`)
- Configuration files (`package.json`, `tsconfig.json`)
- Documentation (`README.md`, `SETUP.md`)
- Public assets (`public/` directory)
- `.gitignore` files

## Verify Ignored Files

To see what files are being ignored:
```bash
git status --ignored
```

Files marked with `!!` are properly ignored.
