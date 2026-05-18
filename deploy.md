# Vercel Deployment Debugging Guide

Lessons from troubleshooting Vercel deploy failures in this project.

## Error 1: Outdated lockfile

```
ERR_PNPM_OUTDATED_LOCKFILE — Cannot install with "frozen-lockfile"
specifiers in the lockfile don't match specifiers in package.json:
* 1 dependencies were removed: zod@^4.4.3
```

**Cause**: A dependency was removed from `package.json` but `pnpm-lock.yaml` was not regenerated. Vercel runs `pnpm install --frozen-lockfile` which requires exact lockfile match.

**Fix**: Run `pnpm install --no-frozen-lockfile` locally, commit updated `pnpm-lock.yaml`.

**Prevention**: After any change to `dependencies` or `devDependencies` in `package.json`, always run `pnpm install` and commit the lockfile.

## Error 2: Missing dependency after lockfile fix

```
Module not found: Can't resolve 'zod'
./lib/validation.ts
```

**Cause**: `zod` was removed from `package.json` but `lib/validation.ts` still imported it for 16 Zod validation schemas used across 30+ API routes. The lockfile fix (Error 1) only revealed this deeper issue.

**Fix**: Restored `"zod": "^4.4.3"` to `package.json`, regenerated lockfile.

**Prevention**: Before removing a dependency, grep the codebase for imports of that package. Never remove a dependency that is still in use.

## Error 3: Missing client-reference-manifest in route group

```
Error: ENOENT: no such file or directory,
lstat '/vercel/path0/apps/web/.next/server/app/(dashboard)/page_client-reference-manifest.js'
```

**Cause**: Complex root cause — this is a Next.js route conflict bug.

1. `app/page.tsx` (public landing) and `app/(dashboard)/page.tsx` (dashboard home) both mapped to `/`
2. Next.js allowed this silently — root `page.tsx` won the route, `(dashboard)/page.tsx` was shadowed (compiled as a build artifact but never served)
3. The shadowed page was partially compiled: its `page.js` and `page.js.nft.json` were generated, but the `page_client-reference-manifest.js` was NOT created
4. Vercel's post-build file tracing reads `.nft.json` files and copies all listed files — hitting ENOENT on the missing manifest

**Why it passed locally but failed on Vercel**: Next.js's own trace step (`Traced Next.js server files`) is lenient about missing files in `.nft.json`. Vercel's file tracer is strict and fails the build.

**Fix**: Removed `app/(dashboard)/page.tsx` (never served anyway). Added middleware redirect for authenticated users from `/` to `/workflows` so they reach dashboard content instead of the landing page.

**Prevention**: Never have two `page.tsx` files mapping to the same route, even if one is in a route group. Route groups like `(dashboard)` do NOT add path segments — they only group files for shared layouts.

## Error 4: Route conflict = silent dead code

A side effect of Error 3: the dashboard home page at `(dashboard)/page.tsx` was **never accessible** to users. Authenticated users visiting `/` always saw the landing page because root `page.tsx` took priority. The dashboard's Bento grid, pipeline chart, run health cards, and onboarding wizard were compiled but unreachable.

**Lesson**: When using Next.js route groups for layout sharing, ensure page routes don't collide. Use `grep -r "page\.tsx" app/` to audit all page files and check for path conflicts.

## Error 5: Authenticated users seeing landing page

After fixing Error 3, authenticated users at `/` would still see the landing page (since `app/page.tsx` is static and has no auth check). Added middleware redirect at `/` → `/workflows` for users with valid sessions.

## Summary checklist

- [ ] After changing dependencies: run `pnpm install`, commit lockfile
- [ ] Before removing a dependency: grep for imports
- [ ] No two `page.tsx` files at the same route (route groups don't change paths)
- [ ] Verify build locally: `pnpm --filter @opsflow/web build`
